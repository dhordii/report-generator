import ExcelJS from 'exceljs';
import type { AnalysisResult, ReportChartImages } from './types';

const colors = {
  navy: '111827',
  blue: '2563EB',
  blueSoft: 'EAF1FF',
  line: 'D9DEE8',
  gray: '667085',
  pale: 'F6F7F9',
  green: '14804A',
  amber: 'B45309',
  red: 'B42318',
  white: 'FFFFFF',
};

const bodyFont = { name: 'Arial', size: 10, color: { argb: colors.navy } };

function configureSheet(sheet: ExcelJS.Worksheet, tabColor?: string) {
  sheet.views = [{ showGridLines: false }];
  if (tabColor) sheet.properties.tabColor = { argb: tabColor };
}

function title(sheet: ExcelJS.Worksheet, text: string, note?: string) {
  sheet.getCell('A2').value = text;
  sheet.getCell('A2').font = { ...bodyFont, size: 15, bold: true };
  sheet.getRow(3).height = 6;
  sheet.getCell('A4').value = note ?? '';
  sheet.getCell('A4').font = { ...bodyFont, color: { argb: colors.gray }, italic: true };
  sheet.getCell('A5').border = { bottom: { style: 'thin', color: { argb: colors.line } } };
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.navy } };
    cell.font = { ...bodyFont, bold: true, color: { argb: colors.white } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { right: { style: 'thin', color: { argb: colors.white } } };
  });
}

function styleDataRows(sheet: ExcelJS.Worksheet, start: number, end: number, columns: number) {
  for (let rowNumber = start; rowNumber <= end; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = 20;
    row.font = bodyFont;
    if (rowNumber % 2 === 0) {
      for (let column = 1; column <= columns; column += 1) {
        row.getCell(column).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.pale } };
      }
    }
  }
}

function addImage(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, dataUrl: string, range: string) {
  const imageId = workbook.addImage({ base64: dataUrl, extension: 'png' });
  sheet.addImage(imageId, range);
}

function addOverview(workbook: ExcelJS.Workbook, result: AnalysisResult, images: ReportChartImages) {
  const sheet = workbook.addWorksheet('Overview');
  configureSheet(sheet, colors.navy);
  title(sheet, 'Sales Report', 'Static snapshot · Completed orders only · USD · Profit uses standard product cost');
  sheet.columns = Array.from({ length: 16 }, (_, index) => ({ width: index === 0 ? 3 : 13 }));

  const metrics = [
    ['Revenue', result.summary.revenue, '$#,##0.00'],
    ['Estimated profit', result.summary.estimatedProfit, '$#,##0.00'],
    ['Completed orders', result.summary.completedOrders, '#,##0'],
    ['Unique customers', result.summary.uniqueCustomers, '#,##0'],
  ] as const;
  metrics.forEach(([label, value, numberFormat], index) => {
    const column = 2 + index * 3;
    const labelCell = sheet.getCell(7, column);
    const valueCell = sheet.getCell(8, column);
    labelCell.value = label;
    labelCell.font = { ...bodyFont, bold: true, color: { argb: colors.gray } };
    valueCell.value = value;
    valueCell.numFmt = numberFormat;
    valueCell.font = { ...bodyFont, bold: true, size: 14 };
  });

  sheet.getCell('B11').value = 'Deterministic summary';
  sheet.getCell('B11').font = { ...bodyFont, bold: true };
  result.narrative.forEach((line, index) => {
    sheet.getCell(12 + index, 2).value = line;
    sheet.getCell(12 + index, 2).font = bodyFont;
  });

  addImage(workbook, sheet, images.monthly, 'B17:I35');
  addImage(workbook, sheet, images.categories, 'J17:P35');

  sheet.getCell('B38').value = 'Data handling';
  sheet.getCell('B38').font = { ...bodyFont, bold: true };
  sheet.getCell('B39').value = `${result.summary.excludedOrderRows} order row(s) and ${result.summary.excludedProductRows} product row(s) excluded; ${result.summary.cancelledRows} cancelled and ${result.summary.pendingRows} pending row(s) retained outside financial KPIs.`;
  sheet.getCell('B40').value = `${result.issues.length} issue record(s) are documented on Data Issues.`;
  sheet.getCell('B41').value = 'This workbook is a generated snapshot and does not recalculate source formulas.';
  for (let row = 39; row <= 41; row += 1) {
    for (let column = 2; column <= 16; column += 1) {
      sheet.getCell(row, column).font = { ...bodyFont, color: { argb: colors.gray } };
    }
  }
}

function addProducts(workbook: ExcelJS.Workbook, result: AnalysisResult, images: ReportChartImages) {
  const sheet = workbook.addWorksheet('Products');
  configureSheet(sheet, colors.blue);
  title(sheet, 'Product performance', 'Completed orders only; profit is estimated from standard unit cost.');
  sheet.columns = [
    { width: 3 }, { width: 15 }, { width: 28 }, { width: 20 }, { width: 13 }, { width: 16 }, { width: 18 },
  ];
  const headerRow = 7;
  const rows = result.products.map((product) => [product.productId, product.productName, product.category, product.units, product.revenue, product.estimatedProfit]);
  sheet.addTable({
    name: 'ProductsTable',
    ref: `B${headerRow}`,
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: ['Product ID', 'Product name', 'Category', 'Units sold', 'Revenue', 'Estimated profit'].map((name) => ({ name })),
    rows,
  });
  styleHeader(sheet.getRow(headerRow));
  styleDataRows(sheet, headerRow + 1, headerRow + rows.length, 7);
  sheet.getColumn(6).numFmt = '$#,##0.00';
  sheet.getColumn(7).numFmt = '$#,##0.00';
  sheet.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: false }];
  addImage(workbook, sheet, images.products, 'I2:P19');
  addImage(workbook, sheet, images.units, 'I21:P38');
}

function addCustomers(workbook: ExcelJS.Workbook, result: AnalysisResult, images: ReportChartImages) {
  const sheet = workbook.addWorksheet('Customers');
  configureSheet(sheet, '4F46E5');
  title(sheet, 'Customer performance', 'Completed orders only; category spend is shown for the ten highest-revenue customers.');
  sheet.columns = [{ width: 3 }, { width: 18 }, { width: 18 }, { width: 20 }];
  const headerRow = 7;
  const rows = result.customers.map((customer) => [customer.customerId, customer.revenue, customer.estimatedProfit]);
  sheet.addTable({
    name: 'CustomersTable',
    ref: `B${headerRow}`,
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: ['Customer ID', 'Revenue', 'Estimated profit'].map((name) => ({ name })),
    rows,
  });
  styleHeader(sheet.getRow(headerRow));
  styleDataRows(sheet, headerRow + 1, headerRow + rows.length, 4);
  sheet.getColumn(3).numFmt = '$#,##0.00';
  sheet.getColumn(4).numFmt = '$#,##0.00';
  sheet.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: false }];
  addImage(workbook, sheet, images.customers, 'F2:O24');
}

function addMonthlyTrends(workbook: ExcelJS.Workbook, result: AnalysisResult) {
  const sheet = workbook.addWorksheet('Monthly Trends');
  configureSheet(sheet, '0F766E');
  title(sheet, 'Monthly trends', result.months.length >= 24 ? 'Twenty-four months are available for descriptive seasonality review.' : 'A shorter series is shown without a seasonality claim.');
  sheet.columns = [{ width: 3 }, { width: 15 }, { width: 18 }, { width: 20 }, { width: 19 }];
  const headerRow = 7;
  const rows = result.months.map((month) => [month.month, month.revenue, month.estimatedProfit, month.completedOrders]);
  sheet.addTable({
    name: 'MonthlyTrendsTable',
    ref: `B${headerRow}`,
    headerRow: true,
    style: { theme: 'TableStyleMedium4', showRowStripes: true },
    columns: ['Month', 'Revenue', 'Estimated profit', 'Completed orders'].map((name) => ({ name })),
    rows,
  });
  styleHeader(sheet.getRow(headerRow));
  styleDataRows(sheet, headerRow + 1, headerRow + rows.length, 5);
  sheet.getColumn(3).numFmt = '$#,##0.00';
  sheet.getColumn(4).numFmt = '$#,##0.00';
  sheet.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: false }];
}

function addDataIssues(workbook: ExcelJS.Workbook, result: AnalysisResult) {
  const sheet = workbook.addWorksheet('Data Issues');
  configureSheet(sheet, colors.amber);
  title(sheet, 'Data issues', 'Every correction, exclusion, warning, duplicate decision, and formula limitation recorded during generation.');
  sheet.columns = [
    { width: 3 }, { width: 12 }, { width: 24 }, { width: 14 }, { width: 28 }, { width: 12 }, { width: 22 },
    { width: 24 }, { width: 24 }, { width: 14 }, { width: 52 }, { width: 52 },
  ];
  const headerRow = 7;
  const rows = result.issues.map((item) => [
    item.severity,
    item.code,
    item.dataset,
    item.sourceFile ?? '',
    item.sourceRow ?? '',
    item.field ?? '',
    item.originalValue ?? '',
    item.correctedValue ?? '',
    item.resolution === 'corrected' ? 'Corrected' : item.resolution === 'excluded' ? 'Excluded' : 'Review',
    item.message,
    item.action,
  ]);
  sheet.addTable({
    name: 'DataIssuesTable',
    ref: `B${headerRow}`,
    headerRow: true,
    style: { theme: 'TableStyleMedium9', showRowStripes: true },
    columns: ['Severity', 'Code', 'Dataset', 'Source file', 'Source row', 'Field', 'Original value', 'Corrected value', 'Status', 'Issue', 'Action'].map((name) => ({ name })),
    rows,
  });
  styleHeader(sheet.getRow(headerRow));
  styleDataRows(sheet, headerRow + 1, headerRow + rows.length, 12);
  for (let rowNumber = headerRow + 1; rowNumber <= headerRow + rows.length; rowNumber += 1) {
    const severity = String(sheet.getCell(rowNumber, 2).value ?? '');
    const color = severity === 'blocker' || severity === 'error' ? colors.red : severity === 'warning' ? colors.amber : colors.gray;
    sheet.getCell(rowNumber, 2).font = { ...bodyFont, bold: true, color: { argb: color } };
  }
  sheet.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: false }];
}

function addProcessedData(workbook: ExcelJS.Workbook, result: AnalysisResult) {
  const sheet = workbook.addWorksheet('Processed Data');
  configureSheet(sheet, colors.gray);
  title(sheet, 'Processed data', 'Validated rows retained in the report, including cancelled and pending statuses outside financial KPIs.');
  sheet.columns = [
    { width: 3 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 15 }, { width: 28 }, { width: 19 },
    { width: 14 }, { width: 13 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 15 }, { width: 14 }, { width: 42 },
  ];
  const headerRow = 7;
  const rows = result.processedRows.map((item) => [
    item.sourceRow, item.orderLineId, item.orderId, item.customerId, item.productId, item.productName, item.category,
    new Date(`${item.orderDate}T00:00:00Z`), item.status, item.quantity, item.unitPrice, item.unitCost,
    item.revenue, item.estimatedCost, item.estimatedProfit, item.estimatedMargin, item.includedInKpi ? 'Yes' : 'No', item.kpiReason,
  ]);
  sheet.addTable({
    name: 'ProcessedDataTable',
    ref: `B${headerRow}`,
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: [
      'Source row', 'Order line ID', 'Order ID', 'Customer ID', 'Product ID', 'Product name', 'Category', 'Order date', 'Status',
      'Quantity', 'Unit price', 'Standard unit cost', 'Revenue', 'Estimated cost', 'Estimated profit', 'Estimated margin', 'Included in KPI', 'KPI reason',
    ].map((name) => ({ name })),
    rows,
  });
  styleHeader(sheet.getRow(headerRow));
  styleDataRows(sheet, headerRow + 1, headerRow + rows.length, 19);
  sheet.getColumn(9).numFmt = 'yyyy-mm-dd';
  for (const column of [12, 13, 14, 15, 16]) sheet.getColumn(column).numFmt = '$#,##0.00';
  sheet.getColumn(17).numFmt = '0.0%';
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: headerRow, showGridLines: false }];
}

export async function buildReportWorkbook(result: AnalysisResult, images: ReportChartImages): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Report Generator';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = false;
  addOverview(workbook, result, images);
  addProducts(workbook, result, images);
  addCustomers(workbook, result, images);
  addMonthlyTrends(workbook, result);
  addDataIssues(workbook, result);
  addProcessedData(workbook, result);
  const generated: unknown = await workbook.xlsx.writeBuffer();
  if (generated instanceof ArrayBuffer) return generated;
  if (ArrayBuffer.isView(generated)) {
    const copy = new Uint8Array(generated.byteLength);
    copy.set(new Uint8Array(generated.buffer, generated.byteOffset, generated.byteLength));
    return copy.buffer;
  }
  throw new Error('ExcelJS returned an unsupported workbook buffer.');
}
