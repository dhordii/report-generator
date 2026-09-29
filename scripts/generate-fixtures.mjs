import { mkdir } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { createConflictingProductWorkbooks, createSampleWorkbooks } from '../src/domain/sampleData.ts';

async function writeWorkbook(parsed, outputPath) {
  const workbook = new ExcelJS.Workbook();
  for (const parsedSheet of parsed.sheets) {
    const sheet = workbook.addWorksheet(parsedSheet.name);
    sheet.addRow(parsedSheet.headers);
    for (const parsedRow of parsedSheet.rows) {
      sheet.addRow(parsedSheet.headers.map((header) => {
        const cell = parsedRow.cells[header];
        if (!cell || cell.value === null) return null;
        if (cell.kind === 'formula' && cell.formula) return { formula: cell.formula, result: cell.value };
        return cell.value;
      }));
    }
  }
  await workbook.xlsx.writeFile(outputPath);
}

await mkdir('fixtures', { recursive: true });
const sample = createSampleWorkbooks();
const blocking = createConflictingProductWorkbooks();
await Promise.all([
  writeWorkbook(sample.orders, 'fixtures/orders_sample.xlsx'),
  writeWorkbook(sample.products, 'fixtures/products_sample.xlsx'),
  writeWorkbook(blocking.orders, 'fixtures/orders_blocking_fixture.xlsx'),
  writeWorkbook(blocking.products, 'fixtures/products_blocking_fixture.xlsx'),
]);

console.log('Generated sample and blocking-conflict workbook pairs in fixtures/.');
