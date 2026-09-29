import { describe, expect, it } from 'vitest';
import { analyzeWorkbooks, collectSourceStatuses, suggestOrderMapping, suggestProductMapping, suggestStatusMapping } from './processing';
import { createConflictingProductWorkbooks, createSampleWorkbooks } from './sampleData';
import type { AnalysisConfig, DataCorrection, ParsedWorkbook } from './types';

function configFor(orders: ParsedWorkbook, products: ParsedWorkbook): AnalysisConfig {
  const orderSheet = orders.sheets[0]!;
  const productSheet = products.sheets[0]!;
  const orderMapping = suggestOrderMapping(orderSheet.headers);
  return {
    ordersSheet: orderSheet.name,
    productsSheet: productSheet.name,
    orderMapping,
    productMapping: suggestProductMapping(productSheet.headers),
    statusMapping: suggestStatusMapping(collectSourceStatuses(orderSheet, orderMapping)),
    textNumberFormat: 'us',
    textDateFormat: 'yyyy-mm-dd',
  };
}

describe('analyzeWorkbooks', () => {
  it('keeps non-completed rows for audit while excluding them from KPIs', () => {
    const sample = createSampleWorkbooks();
    const result = analyzeWorkbooks(sample.orders, sample.products, configFor(sample.orders, sample.products));

    expect(result.blockers).toBe(0);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.identicalProductDuplicates).toBe(1);
    expect(result.identicalOrderDuplicates).toBe(1);
    expect(result.summary.cancelledRows).toBeGreaterThan(0);
    expect(result.summary.pendingRows).toBeGreaterThan(0);
    expect(result.processedRows.some((row) => row.status !== 'Completed' && !row.includedInKpi)).toBe(true);
    expect(result.processedRows.every((row) => /^202[45]-\d{2}-\d{2}$/.test(row.orderDate))).toBe(true);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'invalid-order-field',
      'missing-product',
      'identical-product-duplicate',
      'identical-order-duplicate',
      'conflicting-order-line',
      'cached-formula',
    ]));
  });

  it('excludes conflicting product definitions and their related orders without blocking the remaining report', () => {
    const fixture = createConflictingProductWorkbooks();
    const result = analyzeWorkbooks(fixture.orders, fixture.products, configFor(fixture.orders, fixture.products));

    expect(result.blockers).toBe(0);
    expect(result.processedRows.length).toBeGreaterThan(1_000);
    expect(result.processedRows.some((row) => row.productId === 'P-0001')).toBe(false);
    expect(result.summary.excludedProductRows).toBeGreaterThanOrEqual(2);
    expect(result.issues.some((issue) => issue.code === 'excluded-conflicting-product')).toBe(true);
    expect(result.issues.some((issue) => issue.code === 'conflicting-product-id')).toBe(true);
  });

  it('revalidates a session correction, restores the row, and preserves the source workbook', () => {
    const sample = createSampleWorkbooks();
    const sourceBefore = structuredClone(sample.orders.sheets[0]!.rows.find((row) => row.sourceRow === 12));
    const config = configFor(sample.orders, sample.products);
    const initial = analyzeWorkbooks(sample.orders, sample.products, config);
    const correction: DataCorrection = { dataset: 'orders', sourceRow: 12, field: 'quantity', value: '2' };
    const corrected = analyzeWorkbooks(sample.orders, sample.products, config, [correction]);

    expect(corrected.summary.excludedOrderRows).toBe(initial.summary.excludedOrderRows - 1);
    expect(corrected.processedRows.find((row) => row.sourceRow === 12)?.quantity).toBe(2);
    expect(corrected.issues).toContainEqual(expect.objectContaining({
      code: 'manual-correction',
      sourceRow: 12,
      field: 'quantity',
      originalValue: 'two',
      correctedValue: '2',
      resolution: 'corrected',
    }));
    expect(sample.orders.sheets[0]!.rows.find((row) => row.sourceRow === 12)).toEqual(sourceBefore);
  });

  it('can resolve a product conflict and restore related orders', () => {
    const fixture = createConflictingProductWorkbooks();
    const config = configFor(fixture.orders, fixture.products);
    const initial = analyzeWorkbooks(fixture.orders, fixture.products, config);
    const conflictingRow = fixture.products.sheets[0]!.rows.at(-1)!;
    const correction: DataCorrection = {
      dataset: 'products',
      sourceRow: conflictingRow.sourceRow,
      field: 'product_name',
      value: 'Wireless Headphones',
    };
    const corrected = analyzeWorkbooks(fixture.orders, fixture.products, config, [correction]);

    expect(corrected.processedRows.some((row) => row.productId === 'P-0001')).toBe(true);
    expect(corrected.summary.excludedOrderRows).toBeLessThan(initial.summary.excludedOrderRows);
    expect(corrected.issues.some((issue) => issue.code === 'conflicting-product-id')).toBe(false);
  });
});
