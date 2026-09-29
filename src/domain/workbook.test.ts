import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { analyzeWorkbooks, collectSourceStatuses, suggestOrderMapping, suggestProductMapping, suggestStatusMapping } from './processing';
import { createSampleWorkbooks } from './sampleData';
import type { AnalysisConfig, DataCorrection, ParsedWorkbook, ReportChartImages } from './types';
import { buildReportWorkbook } from './workbook';

const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X+XbWQAAAABJRU5ErkJggg==';
const images: ReportChartImages = { monthly: pixel, products: pixel, customers: pixel, units: pixel, categories: pixel };

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

describe('buildReportWorkbook', () => {
  it('produces a reopenable six-sheet workbook with five embedded charts and audit data', async () => {
    const sample = createSampleWorkbooks();
    const correction: DataCorrection = { dataset: 'orders', sourceRow: 12, field: 'quantity', value: '2' };
    const result = analyzeWorkbooks(sample.orders, sample.products, configFor(sample.orders, sample.products), [correction]);
    const buffer = await buildReportWorkbook(result, images);
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(buffer);

    expect(reopened.worksheets.map((sheet) => sheet.name)).toEqual([
      'Overview', 'Products', 'Customers', 'Monthly Trends', 'Data Issues', 'Processed Data',
    ]);
    expect(reopened.worksheets.reduce((count, sheet) => count + sheet.getImages().length, 0)).toBe(5);
    expect(reopened.getWorksheet('Processed Data')!.actualRowCount).toBeGreaterThan(1_000);
    expect(reopened.getWorksheet('Data Issues')!.getTable('DataIssuesTable')).toBeDefined();
    expect(reopened.getWorksheet('Overview')!.getCell('B39').text).toContain('order row(s)');
    const processed = reopened.getWorksheet('Processed Data')!;
    const correctedProcessedRow = processed.getRows(8, processed.rowCount - 7)!.find((row) => row.getCell(2).value === 12);
    expect(correctedProcessedRow?.getCell(11).value).toBe(2);
    const audit = reopened.getWorksheet('Data Issues')!;
    const correctionAuditRow = audit.getRows(8, audit.rowCount - 7)!.find((row) => row.getCell(3).value === 'manual-correction');
    expect(correctionAuditRow?.getCell(8).text).toBe('two');
    expect(correctionAuditRow?.getCell(9).text).toBe('2');
    expect(correctionAuditRow?.getCell(10).text).toBe('Corrected');
  }, 20_000);
});
