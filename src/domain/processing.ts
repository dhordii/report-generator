import {
  orderFields,
  productFields,
  type AnalysisConfig,
  type AnalysisResult,
  type CategoryAggregate,
  type CorrectionField,
  type CustomerAggregate,
  type DataCorrection,
  type DataIssue,
  type DatasetKind,
  type MonthAggregate,
  type OrderField,
  type OrderMapping,
  type OrderStatus,
  type ParsedSheet,
  type ParsedWorkbook,
  type ProcessedRow,
  type ProductAggregate,
  type ProductField,
  type ProductMapping,
  type RawCell,
  type RawRow,
} from './types';

interface ProductRecord {
  sourceRow: number;
  productId: string;
  productName: string;
  category: string;
  unitCost: number;
}

interface OrderCandidate {
  sourceRow: number;
  orderLineId: string;
  orderId: string;
  customerId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  orderDate: string;
  status: OrderStatus;
}

type CorrectionMap = Map<string, DataCorrection>;

function emptyMapping<T extends readonly string[]>(fields: T): Record<T[number], string> {
  return Object.fromEntries(fields.map((field) => [field, ''])) as Record<T[number], string>;
}

export function suggestOrderMapping(headers: string[]): OrderMapping {
  const mapping = emptyMapping(orderFields);
  for (const field of orderFields) mapping[field] = headers.includes(field) ? field : '';
  return mapping;
}

export function suggestProductMapping(headers: string[]): ProductMapping {
  const mapping = emptyMapping(productFields);
  for (const field of productFields) mapping[field] = headers.includes(field) ? field : '';
  return mapping;
}

export function collectSourceStatuses(sheet: ParsedSheet, mapping: OrderMapping): string[] {
  const header = mapping.status;
  if (!header) return [];
  return [...new Set(sheet.rows.map((sourceRow) => sourceRow.cells[header]?.original ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function suggestStatusMapping(statuses: string[]): Record<string, OrderStatus | ''> {
  return Object.fromEntries(statuses.map((status) => [status, status === 'Completed' || status === 'Cancelled' || status === 'Pending' ? status : '']));
}

export function canonicalIdentifier(cell: RawCell | undefined): string | null {
  if (!cell || cell.value === null || cell.value === '') return null;
  if (cell.kind === 'number' && typeof cell.value === 'number' && Number.isFinite(cell.value)) return String(cell.value);
  if (typeof cell.value === 'string') return cell.value;
  if (typeof cell.value === 'number' || typeof cell.value === 'boolean') return String(cell.value);
  return null;
}

function parseNumber(cell: RawCell | undefined, format: AnalysisConfig['textNumberFormat']): number | null {
  if (!cell || cell.value === null || cell.value === '') return null;
  if (typeof cell.value === 'number') return Number.isFinite(cell.value) ? cell.value : null;
  if (typeof cell.value !== 'string') return null;
  const normalized = format === 'us'
    ? cell.value.replace(/,/g, '')
    : cell.value.replace(/[\s\u00a0]/g, '').replace(',', '.');
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseDate(cell: RawCell | undefined, format: AnalysisConfig['textDateFormat']): string | null {
  if (!cell || cell.value === null || cell.value === '') return null;
  if (cell.kind === 'date' && typeof cell.value === 'string') {
    const direct = new Date(cell.value);
    return Number.isNaN(direct.getTime()) ? null : direct.toISOString().slice(0, 10);
  }
  if (typeof cell.value !== 'string') return null;

  const pattern = format === 'yyyy-mm-dd'
    ? /^(\d{4})-(\d{2})-(\d{2})$/
    : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = cell.value.match(pattern);
  if (!match) return null;

  const year = format === 'yyyy-mm-dd' ? Number(match[1]) : Number(match[3]);
  const month = format === 'yyyy-mm-dd' ? Number(match[2]) : format === 'dd/mm/yyyy' ? Number(match[2]) : Number(match[1]);
  const day = format === 'yyyy-mm-dd' ? Number(match[3]) : format === 'dd/mm/yyyy' ? Number(match[1]) : Number(match[2]);
  if (!isValidCalendarDate(year, month, day)) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function mappedCell(row: RawRow, header: string): RawCell | undefined {
  return row.cells[header];
}

function correctionKey(dataset: DatasetKind, sourceRow: number, field: CorrectionField): string {
  return `${dataset}:${sourceRow}:${field}`;
}

function correctionFor(corrections: CorrectionMap, dataset: DatasetKind, sourceRow: number, field: CorrectionField): DataCorrection | undefined {
  return corrections.get(correctionKey(dataset, sourceRow, field));
}

function effectiveCell(source: RawCell | undefined, correction: DataCorrection | undefined): RawCell | undefined {
  if (!correction) return source;
  return { value: correction.value, original: correction.value, kind: 'string' };
}

function issue(
  severity: DataIssue['severity'],
  code: string,
  dataset: DatasetKind,
  message: string,
  action: string,
  context: Omit<Partial<DataIssue>, 'severity' | 'code' | 'dataset' | 'message' | 'action'> = {},
): DataIssue {
  return { severity, code, dataset, message, action, ...context };
}

function issueContext(
  workbook: ParsedWorkbook,
  row: RawRow,
  field: CorrectionField,
  source: RawCell | undefined,
  correction: DataCorrection | undefined,
): Pick<DataIssue, 'sourceFile' | 'sourceRow' | 'field' | 'originalValue' | 'correctedValue' | 'editable'> {
  return {
    sourceFile: workbook.fileName,
    sourceRow: row.sourceRow,
    field,
    originalValue: source?.original ?? '',
    ...(correction ? { correctedValue: correction.value } : {}),
    editable: true,
  };
}

function warnCachedFormulas<T extends CorrectionField>(
  row: RawRow,
  fields: readonly T[],
  mapping: Record<T, string>,
  dataset: DatasetKind,
  workbook: ParsedWorkbook,
  corrections: CorrectionMap,
  issues: DataIssue[],
) {
  for (const field of fields) {
    const source = row.cells[mapping[field]];
    if (source?.kind === 'formula' && source.cached && !correctionFor(corrections, dataset, row.sourceRow, field)) {
      issues.push(issue(
        'warning',
        'cached-formula',
        dataset,
        `Used the cached result of formula ${source.formula ? `“${source.formula}”` : 'cell'}. The browser did not recalculate it.`,
        'Confirm that cached formula results are acceptable for this snapshot.',
        { ...issueContext(workbook, row, field, source, undefined), editable: false },
      ));
    }
  }
}

function selectSheet(workbook: ParsedWorkbook, name: string): ParsedSheet {
  const sheet = workbook.sheets.find((candidate) => candidate.name === name);
  if (!sheet) throw new Error(`Worksheet “${name}” was not found in ${workbook.fileName}.`);
  return sheet;
}

function mappingMissing<T extends string>(mapping: Record<T, string>): T[] {
  return (Object.entries(mapping) as Array<[T, string]>).filter(([, value]) => !value).map(([key]) => key);
}

function productFingerprint(product: ProductRecord): string {
  return JSON.stringify([product.productId, product.productName, product.category, product.unitCost]);
}

function orderFingerprint(order: OrderCandidate): string {
  return JSON.stringify([order.orderLineId, order.orderId, order.customerId, order.productId, order.quantity, order.unitPrice, order.orderDate, order.status]);
}

function makeEmptyResult(issues: DataIssue[]): AnalysisResult {
  return {
    summary: {
      revenue: 0,
      estimatedProfit: 0,
      completedOrders: 0,
      uniqueCustomers: 0,
      excludedRows: 0,
      excludedOrderRows: 0,
      excludedProductRows: 0,
      cancelledRows: 0,
      pendingRows: 0,
    },
    narrative: [],
    processedRows: [],
    issues,
    products: [],
    customers: [],
    months: [],
    categories: [],
    blockers: issues.filter((item) => item.severity === 'blocker').length,
    requiresConfirmation: false,
    identicalProductDuplicates: 0,
    identicalOrderDuplicates: 0,
  };
}

function addCorrectionAudit(
  corrections: DataCorrection[],
  ordersWorkbook: ParsedWorkbook,
  productsWorkbook: ParsedWorkbook,
  orderSheet: ParsedSheet,
  productSheet: ParsedSheet,
  config: AnalysisConfig,
  issues: DataIssue[],
) {
  for (const correction of corrections) {
    const workbook = correction.dataset === 'orders' ? ordersWorkbook : productsWorkbook;
    const sheet = correction.dataset === 'orders' ? orderSheet : productSheet;
    const mapping = correction.dataset === 'orders' ? config.orderMapping : config.productMapping;
    const row = sheet.rows.find((candidate) => candidate.sourceRow === correction.sourceRow);
    if (!row) continue;
    const source = row.cells[mapping[correction.field as keyof typeof mapping]];
    issues.push(issue(
      'info',
      'manual-correction',
      correction.dataset,
      `A session-only correction was applied to “${correction.field}”.`,
      'The corrected value was revalidated and used for this report snapshot. The source workbook was not changed.',
      {
        sourceFile: workbook.fileName,
        sourceRow: correction.sourceRow,
        field: correction.field,
        originalValue: source?.original ?? '',
        correctedValue: correction.value,
        resolution: 'corrected',
        editable: false,
      },
    ));
  }
}

function conflictingFields<T extends CorrectionField>(records: Array<Record<T, string | number>>, fields: readonly T[]): T[] {
  return fields.filter((field) => new Set(records.map((record) => String(record[field]))).size > 1);
}

export function analyzeWorkbooks(
  ordersWorkbook: ParsedWorkbook,
  productsWorkbook: ParsedWorkbook,
  config: AnalysisConfig,
  corrections: DataCorrection[] = [],
): AnalysisResult {
  const issues: DataIssue[] = [];
  const missingOrderMappings = mappingMissing<OrderField>(config.orderMapping);
  const missingProductMappings = mappingMissing<ProductField>(config.productMapping);
  for (const field of missingOrderMappings) {
    issues.push(issue('blocker', 'missing-mapping', 'orders', `Required field “${field}” is not mapped.`, 'Choose a source column.', { sourceFile: ordersWorkbook.fileName, field }));
  }
  for (const field of missingProductMappings) {
    issues.push(issue('blocker', 'missing-mapping', 'products', `Required field “${field}” is not mapped.`, 'Choose a source column.', { sourceFile: productsWorkbook.fileName, field }));
  }
  if (issues.length > 0) return makeEmptyResult(issues);

  const orderSheet = selectSheet(ordersWorkbook, config.ordersSheet);
  const productSheet = selectSheet(productsWorkbook, config.productsSheet);
  const correctionMap = new Map(corrections.map((correction) => [correctionKey(correction.dataset, correction.sourceRow, correction.field), correction]));
  addCorrectionAudit(corrections, ordersWorkbook, productsWorkbook, orderSheet, productSheet, config, issues);

  const excludedProductRows = new Set<number>();
  const excludedOrderRows = new Set<number>();
  const productRecords: ProductRecord[] = [];

  for (const sourceRow of productSheet.rows) {
    const values = {} as Record<ProductField, RawCell | undefined>;
    let valid = true;

    for (const field of productFields) {
      const source = mappedCell(sourceRow, config.productMapping[field]);
      const correction = correctionFor(correctionMap, 'products', sourceRow.sourceRow, field);
      values[field] = effectiveCell(source, correction);
      if (source?.kind === 'formula' && !source.cached && !correction) {
        issues.push(issue(
          'error',
          'formula-without-cache',
          'products',
          'Formula cell has no cached result and cannot be evaluated in the browser.',
          'Enter a replacement value here or save the source workbook after recalculation.',
          { ...issueContext(productsWorkbook, sourceRow, field, source, correction), resolution: 'excluded' },
        ));
        valid = false;
      }
    }
    warnCachedFormulas(sourceRow, productFields, config.productMapping, 'products', productsWorkbook, correctionMap, issues);

    const productId = canonicalIdentifier(values.product_id);
    const productName = values.product_name?.value === null || values.product_name?.value === undefined ? '' : String(values.product_name.value);
    const category = values.category?.value === null || values.category?.value === undefined ? '' : String(values.category.value);
    const unitCost = parseNumber(values.unit_cost, config.textNumberFormat);
    const invalidFields: Array<[ProductField, boolean, string]> = [
      ['product_id', Boolean(productId), 'Product ID is required.'],
      ['product_name', Boolean(productName), 'Product name is required.'],
      ['category', Boolean(category), 'Category is required.'],
      ['unit_cost', unitCost !== null && unitCost >= 0, 'Unit cost must be a non-negative number.'],
    ];
    for (const [field, fieldValid, message] of invalidFields) {
      const source = mappedCell(sourceRow, config.productMapping[field]);
      const correction = correctionFor(correctionMap, 'products', sourceRow.sourceRow, field);
      if (fieldValid || (source?.kind === 'formula' && !source.cached && !correction)) continue;
      issues.push(issue(
        'error',
        'invalid-product-field',
        'products',
        message,
        'Enter a valid replacement value or leave this product excluded.',
        { ...issueContext(productsWorkbook, sourceRow, field, source, correction), resolution: 'excluded' },
      ));
      valid = false;
    }
    if (!valid || !productId || !productName || !category || unitCost === null) {
      excludedProductRows.add(sourceRow.sourceRow);
      continue;
    }
    productRecords.push({ sourceRow: sourceRow.sourceRow, productId, productName, category, unitCost });
  }

  const productsById = new Map<string, ProductRecord[]>();
  for (const product of productRecords) productsById.set(product.productId, [...(productsById.get(product.productId) ?? []), product]);
  const productMap = new Map<string, ProductRecord>();
  const conflictingProductIds = new Set<string>();
  let identicalProductDuplicates = 0;

  for (const [productId, records] of productsById) {
    const fingerprints = new Set(records.map(productFingerprint));
    if (fingerprints.size > 1) {
      conflictingProductIds.add(productId);
      const comparisonRecords = records.map((record) => ({
        product_id: record.productId,
        product_name: record.productName,
        category: record.category,
        unit_cost: record.unitCost,
      }));
      const fields = conflictingFields(comparisonRecords, productFields);
      for (const record of records) {
        excludedProductRows.add(record.sourceRow);
        const row = productSheet.rows.find((candidate) => candidate.sourceRow === record.sourceRow)!;
        for (const field of fields) {
          const source = mappedCell(row, config.productMapping[field]);
          const correction = correctionFor(correctionMap, 'products', row.sourceRow, field);
          issues.push(issue(
            'error',
            'conflicting-product-id',
            'products',
            `Product ID “${productId}” has conflicting values for “${field}”.`,
            'Edit the conflicting value or leave this product and all related orders excluded.',
            { ...issueContext(productsWorkbook, row, field, source, correction), resolution: 'excluded' },
          ));
        }
      }
      continue;
    }
    productMap.set(productId, records[0]!);
    if (records.length > 1) {
      identicalProductDuplicates += records.length - 1;
      for (const duplicate of records.slice(1)) {
        excludedProductRows.add(duplicate.sourceRow);
        const row = productSheet.rows.find((candidate) => candidate.sourceRow === duplicate.sourceRow)!;
        issues.push(issue(
          'warning',
          'identical-product-duplicate',
          'products',
          `An identical row also defines product ID “${productId}”; this duplicate was collapsed.`,
          'Confirm that the duplicate may remain excluded from this snapshot.',
          {
            sourceFile: productsWorkbook.fileName,
            sourceRow: duplicate.sourceRow,
            field: 'product_id',
            originalValue: mappedCell(row, config.productMapping.product_id)?.original ?? productId,
            resolution: 'excluded',
          },
        ));
      }
    }
  }

  const orderCandidates: OrderCandidate[] = [];
  for (const sourceRow of orderSheet.rows) {
    const values = {} as Record<OrderField, RawCell | undefined>;
    let valid = true;
    for (const field of orderFields) {
      const source = mappedCell(sourceRow, config.orderMapping[field]);
      const correction = correctionFor(correctionMap, 'orders', sourceRow.sourceRow, field);
      values[field] = effectiveCell(source, correction);
      if (source?.kind === 'formula' && !source.cached && !correction) {
        issues.push(issue(
          'error',
          'formula-without-cache',
          'orders',
          'Formula cell has no cached result and cannot be evaluated in the browser.',
          'Enter a replacement value here or save the source workbook after recalculation.',
          { ...issueContext(ordersWorkbook, sourceRow, field, source, correction), resolution: 'excluded' },
        ));
        valid = false;
      }
    }
    warnCachedFormulas(sourceRow, orderFields, config.orderMapping, 'orders', ordersWorkbook, correctionMap, issues);

    const orderLineId = canonicalIdentifier(values.order_line_id);
    const orderId = canonicalIdentifier(values.order_id);
    const customerId = canonicalIdentifier(values.customer_id);
    const productId = canonicalIdentifier(values.product_id);
    const quantity = parseNumber(values.quantity, config.textNumberFormat);
    const unitPrice = parseNumber(values.unit_price, config.textNumberFormat);
    const orderDate = parseDate(values.order_date, config.textDateFormat);
    const statusCorrection = correctionFor(correctionMap, 'orders', sourceRow.sourceRow, 'status');
    const sourceStatus = mappedCell(sourceRow, config.orderMapping.status)?.original ?? '';
    const status = statusCorrection
      ? (['Completed', 'Cancelled', 'Pending'].includes(statusCorrection.value) ? statusCorrection.value as OrderStatus : '')
      : config.statusMapping[sourceStatus];
    const invalidFields: Array<[OrderField, boolean, string]> = [
      ['order_line_id', Boolean(orderLineId), 'Order line ID is required.'],
      ['order_id', Boolean(orderId), 'Order ID is required.'],
      ['customer_id', Boolean(customerId), 'Customer ID is required.'],
      ['product_id', Boolean(productId), 'Product ID is required.'],
      ['quantity', quantity !== null && quantity > 0, 'Quantity must be a number greater than zero.'],
      ['unit_price', unitPrice !== null && unitPrice >= 0, 'Unit price must be a non-negative number.'],
      ['order_date', Boolean(orderDate), 'Order date does not match the selected text date format.'],
      ['status', Boolean(status), 'Status must map to Completed, Cancelled, or Pending.'],
    ];
    for (const [field, fieldValid, message] of invalidFields) {
      const source = mappedCell(sourceRow, config.orderMapping[field]);
      const correction = correctionFor(correctionMap, 'orders', sourceRow.sourceRow, field);
      if (fieldValid || (source?.kind === 'formula' && !source.cached && !correction)) continue;
      issues.push(issue(
        'error',
        'invalid-order-field',
        'orders',
        message,
        'Enter a valid replacement value or leave this order row excluded.',
        { ...issueContext(ordersWorkbook, sourceRow, field, source, correction), resolution: 'excluded' },
      ));
      valid = false;
    }
    if (!valid || !orderLineId || !orderId || !customerId || !productId || quantity === null || unitPrice === null || !orderDate || !status) {
      excludedOrderRows.add(sourceRow.sourceRow);
      continue;
    }
    if (!productMap.has(productId)) {
      const source = mappedCell(sourceRow, config.orderMapping.product_id);
      const correction = correctionFor(correctionMap, 'orders', sourceRow.sourceRow, 'product_id');
      const isConflict = conflictingProductIds.has(productId);
      issues.push(issue(
        'error',
        isConflict ? 'excluded-conflicting-product' : 'missing-product',
        'orders',
        isConflict
          ? `Product ID “${productId}” has conflicting product definitions, so this related order was excluded.`
          : `Product ID “${productId}” is not present in the valid products data.`,
        isConflict
          ? 'Resolve the product conflict or change this order product ID.'
          : 'Enter a product ID that exists in the valid products data or leave this row excluded.',
        { ...issueContext(ordersWorkbook, sourceRow, 'product_id', source, correction), resolution: 'excluded' },
      ));
      excludedOrderRows.add(sourceRow.sourceRow);
      continue;
    }
    orderCandidates.push({ sourceRow: sourceRow.sourceRow, orderLineId, orderId, customerId, productId, quantity, unitPrice, orderDate, status });
  }

  const ordersByLine = new Map<string, OrderCandidate[]>();
  for (const order of orderCandidates) ordersByLine.set(order.orderLineId, [...(ordersByLine.get(order.orderLineId) ?? []), order]);
  const deduplicatedOrders: OrderCandidate[] = [];
  let identicalOrderDuplicates = 0;
  for (const [orderLineId, records] of ordersByLine) {
    const fingerprints = new Set(records.map(orderFingerprint));
    if (fingerprints.size > 1) {
      const comparisonRecords = records.map((record) => ({
        order_line_id: record.orderLineId,
        order_id: record.orderId,
        customer_id: record.customerId,
        product_id: record.productId,
        quantity: record.quantity,
        unit_price: record.unitPrice,
        order_date: record.orderDate,
        status: record.status,
      }));
      const fields = conflictingFields(comparisonRecords, orderFields);
      for (const record of records) {
        excludedOrderRows.add(record.sourceRow);
        const row = orderSheet.rows.find((candidate) => candidate.sourceRow === record.sourceRow)!;
        for (const field of fields) {
          const source = mappedCell(row, config.orderMapping[field]);
          const correction = correctionFor(correctionMap, 'orders', row.sourceRow, field);
          issues.push(issue(
            'error',
            'conflicting-order-line',
            'orders',
            `Order line ID “${orderLineId}” has conflicting values for “${field}”.`,
            'Edit the conflicting value or leave every version of this order line excluded.',
            { ...issueContext(ordersWorkbook, row, field, source, correction), resolution: 'excluded' },
          ));
        }
      }
      continue;
    }
    deduplicatedOrders.push(records[0]!);
    if (records.length > 1) {
      identicalOrderDuplicates += records.length - 1;
      for (const duplicate of records.slice(1)) {
        excludedOrderRows.add(duplicate.sourceRow);
        const row = orderSheet.rows.find((candidate) => candidate.sourceRow === duplicate.sourceRow)!;
        issues.push(issue(
          'warning',
          'identical-order-duplicate',
          'orders',
          `An identical row also defines order line ID “${orderLineId}”; this duplicate was collapsed.`,
          'Confirm that the duplicate may remain excluded from this snapshot.',
          {
            sourceFile: ordersWorkbook.fileName,
            sourceRow: duplicate.sourceRow,
            field: 'order_line_id',
            originalValue: mappedCell(row, config.orderMapping.order_line_id)?.original ?? orderLineId,
            resolution: 'excluded',
          },
        ));
      }
    }
  }

  const processedRows: ProcessedRow[] = deduplicatedOrders.map((order) => {
    const product = productMap.get(order.productId)!;
    const revenue = order.quantity * order.unitPrice;
    const estimatedCost = order.quantity * product.unitCost;
    const estimatedProfit = revenue - estimatedCost;
    const includedInKpi = order.status === 'Completed';
    return {
      sourceRow: order.sourceRow,
      orderLineId: order.orderLineId,
      orderId: order.orderId,
      customerId: order.customerId,
      productId: order.productId,
      productName: product.productName,
      category: product.category,
      orderDate: order.orderDate,
      status: order.status,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      unitCost: product.unitCost,
      revenue,
      estimatedCost,
      estimatedProfit,
      estimatedMargin: revenue === 0 ? null : estimatedProfit / revenue,
      includedInKpi,
      kpiReason: includedInKpi ? 'Completed order' : `${order.status} orders are excluded from financial KPIs`,
    };
  });

  const completed = processedRows.filter((row) => row.includedInKpi);
  const products = aggregateProducts(completed);
  const customers = aggregateCustomers(completed);
  const months = aggregateMonths(completed);
  const categories = aggregateCategories(completed);
  const summary = {
    revenue: sum(completed, (row) => row.revenue),
    estimatedProfit: sum(completed, (row) => row.estimatedProfit),
    completedOrders: new Set(completed.map((row) => row.orderId)).size,
    uniqueCustomers: new Set(completed.map((row) => row.customerId)).size,
    excludedRows: excludedOrderRows.size + excludedProductRows.size,
    excludedOrderRows: excludedOrderRows.size,
    excludedProductRows: excludedProductRows.size,
    cancelledRows: processedRows.filter((row) => row.status === 'Cancelled').length,
    pendingRows: processedRows.filter((row) => row.status === 'Pending').length,
  };

  const narrative = makeNarrative(summary.revenue, summary.estimatedProfit, products, categories, months);
  const blockers = issues.filter((item) => item.severity === 'blocker').length;
  const requiresConfirmation = issues.some((item) => item.severity === 'error' || item.severity === 'warning');

  return {
    summary,
    narrative,
    processedRows,
    issues,
    products,
    customers,
    months,
    categories,
    blockers,
    requiresConfirmation,
    identicalProductDuplicates,
    identicalOrderDuplicates,
  };
}

function sum<T>(rows: T[], selector: (row: T) => number): number {
  return rows.reduce((total, row) => total + selector(row), 0);
}

function aggregateProducts(rows: ProcessedRow[]): ProductAggregate[] {
  const map = new Map<string, ProductAggregate>();
  for (const row of rows) {
    const current = map.get(row.productId) ?? { productId: row.productId, productName: row.productName, category: row.category, units: 0, revenue: 0, estimatedProfit: 0 };
    current.units += row.quantity;
    current.revenue += row.revenue;
    current.estimatedProfit += row.estimatedProfit;
    map.set(row.productId, current);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

function aggregateCustomers(rows: ProcessedRow[]): CustomerAggregate[] {
  const map = new Map<string, CustomerAggregate>();
  for (const row of rows) {
    const current = map.get(row.customerId) ?? { customerId: row.customerId, revenue: 0, estimatedProfit: 0, categories: {} };
    current.revenue += row.revenue;
    current.estimatedProfit += row.estimatedProfit;
    current.categories[row.category] = (current.categories[row.category] ?? 0) + row.revenue;
    map.set(row.customerId, current);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

function aggregateMonths(rows: ProcessedRow[]): MonthAggregate[] {
  const map = new Map<string, MonthAggregate & { orders: Set<string> }>();
  for (const row of rows) {
    const month = row.orderDate.slice(0, 7);
    const current = map.get(month) ?? { month, revenue: 0, estimatedProfit: 0, completedOrders: 0, orders: new Set<string>() };
    current.revenue += row.revenue;
    current.estimatedProfit += row.estimatedProfit;
    current.orders.add(row.orderId);
    map.set(month, current);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).map(({ orders, ...month }) => ({ ...month, completedOrders: orders.size }));
}

function aggregateCategories(rows: ProcessedRow[]): CategoryAggregate[] {
  const map = new Map<string, CategoryAggregate>();
  for (const row of rows) {
    const current = map.get(row.category) ?? { category: row.category, revenue: 0, estimatedProfit: 0, units: 0 };
    current.revenue += row.revenue;
    current.estimatedProfit += row.estimatedProfit;
    current.units += row.quantity;
    map.set(row.category, current);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function makeNarrative(revenue: number, profit: number, products: ProductAggregate[], categories: CategoryAggregate[], months: MonthAggregate[]): string[] {
  const narrative = [`Completed orders generated ${formatUsd(revenue)} in revenue and ${formatUsd(profit)} in estimated profit using standard product costs.`];
  const topProduct = products[0];
  if (topProduct) narrative.push(`${topProduct.productName} was the highest-revenue product at ${formatUsd(topProduct.revenue)}.`);
  const topCategory = categories[0];
  if (topCategory) narrative.push(`${topCategory.category} was the highest-revenue category at ${formatUsd(topCategory.revenue)}.`);
  if (months.length >= 24) {
    const peak = [...months].sort((a, b) => b.revenue - a.revenue)[0];
    if (peak) narrative.push(`The 24-month series peaks in ${peak.month} at ${formatUsd(peak.revenue)}; this is a descriptive seasonality signal, not a forecast.`);
  }
  return narrative;
}
