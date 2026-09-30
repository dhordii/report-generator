import ExcelJS from 'exceljs';
import { expect, test } from '@playwright/test';

async function writeSourceWorkbook(path: string, headers: string[], rows: Array<Array<string | number>>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  await workbook.xlsx.writeFile(path);
}

test('sample data generates a verified report download', async ({ page }, testInfo) => {
  await page.goto('/');
  const filesStep = page.getByRole('button', { name: 'Go to Files' });
  const mapStep = page.getByRole('button', { name: 'Go to Map columns' });
  const reviewStep = page.getByRole('button', { name: 'Go to Review issues' });
  const reportStep = page.getByRole('button', { name: 'Go to Download report' });
  await expect(filesStep).toBeDisabled();
  await expect(mapStep).toBeDisabled();
  await expect(reviewStep).toBeDisabled();
  await expect(reportStep).toBeDisabled();

  await page.getByRole('button', { name: 'Try sample data' }).click();
  await expect(page.getByRole('heading', { name: 'Map source columns' })).toBeVisible();
  await expect(page.getByText('All required mappings are ready.')).toBeVisible();
  await expect(filesStep).toBeEnabled();
  await expect(mapStep).toBeDisabled();
  await expect(reviewStep).toBeDisabled();
  await filesStep.click();
  await expect(page.getByRole('heading', { name: 'Synthetic sample — Sales overview' })).toBeVisible();
  await mapStep.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Map source columns' })).toBeVisible();

  await page.getByRole('button', { name: 'Validate data' }).click();
  await expect(page.getByRole('heading', { name: 'Review validation results' })).toBeVisible();
  await expect(mapStep).toBeEnabled();
  await expect(reviewStep).toBeDisabled();
  await mapStep.click();
  await page.getByLabel('Text number format').selectOption('eu');
  await expect(reviewStep).toBeDisabled();
  await page.getByLabel('Text number format').selectOption('us');
  await page.getByRole('button', { name: 'Validate data' }).click();
  await expect(page.getByRole('heading', { name: 'Review validation results' })).toBeVisible();
  await expect(page.getByText('Excluded order rows').locator('..')).toContainText('5');
  const quantityIssue = page.getByRole('row', { name: /Quantity must be a number greater than zero/ });
  await quantityIssue.getByRole('button', { name: 'Edit value' }).click();
  const quantityEditor = page.getByLabel('Replacement for orders row 12, quantity');
  await quantityEditor.fill('2');
  await page.getByRole('button', { name: 'Save & revalidate' }).click();
  await expect(page.getByText('Excluded order rows').locator('..')).toContainText('4');
  await expect(page.getByText('A session-only correction was applied to “quantity”.')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Excluded order rows').locator('..')).toContainText('5');
  await page.getByRole('row', { name: /Quantity must be a number greater than zero/ }).getByRole('button', { name: 'Edit value' }).click();
  await page.getByLabel('Replacement for orders row 12, quantity').fill('2');
  await page.getByRole('button', { name: 'Save & revalidate' }).click();
  await expect(page.getByText('Excluded order rows').locator('..')).toContainText('4');
  const generateButton = page.getByRole('button', { name: 'Generate Excel report' });
  await expect(generateButton).toBeDisabled();
  await page.getByRole('checkbox', { name: /Generate from valid rows/ }).check();
  await generateButton.click();

  const downloadLink = page.getByRole('link', { name: 'Download report' });
  await expect(downloadLink).toBeVisible({ timeout: 30_000 });
  await expect(reviewStep).toBeEnabled();
  await expect(reportStep).toBeDisabled();
  await reviewStep.click();
  await expect(page.getByRole('heading', { name: 'Review validation results' })).toBeVisible();
  await expect(reportStep).toBeEnabled();
  await reportStep.click();
  await expect(downloadLink).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await downloadLink.click();
  const download = await downloadPromise;
  const outputPath = testInfo.outputPath('Sales Report.xlsx');
  await download.saveAs(outputPath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputPath);
  expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
    'Overview', 'Products', 'Customers', 'Monthly Trends', 'Data Issues', 'Processed Data',
  ]);
  expect(workbook.worksheets.reduce((count, sheet) => count + sheet.getImages().length, 0)).toBe(5);
  expect(workbook.getWorksheet('Processed Data')!.actualRowCount).toBeGreaterThan(1_000);
  const processed = workbook.getWorksheet('Processed Data')!;
  const correctedProcessedRow = processed.getRows(8, processed.rowCount - 7)!.find((row) => row.getCell(2).value === 12);
  expect(correctedProcessedRow?.getCell(11).value).toBe(2);
  const audit = workbook.getWorksheet('Data Issues')!;
  const correctionAuditRow = audit.getRows(8, audit.rowCount - 7)!.find((row) => row.getCell(3).value === 'manual-correction');
  expect(correctionAuditRow?.getCell(8).text).toBe('two');
  expect(correctionAuditRow?.getCell(9).text).toBe('2');
  expect(correctionAuditRow?.getCell(10).text).toBe('Corrected');
});

test('uploaded xlsx files are parsed and generate the expected KPI value', async ({ page }, testInfo) => {
  const ordersPath = testInfo.outputPath('orders.xlsx');
  const productsPath = testInfo.outputPath('products.xlsx');
  await writeSourceWorkbook(ordersPath, [
    'order_line_id', 'order_id', 'customer_id', 'product_id', 'quantity', 'unit_price', 'order_date', 'status',
  ], [
    [1, 'ORD-1', 'C-1', 123, 2, 50, '2025-01-15', 'Completed'],
    [2, 'ORD-2', 'C-2', 123, 1, 50, '2025-01-16', 'Pending'],
  ]);
  await writeSourceWorkbook(productsPath, ['product_id', 'product_name', 'category', 'unit_cost'], [
    [123, 'Test Product', 'Test Category', 30],
  ]);

  await page.goto('/');
  const inputs = page.locator('input[type="file"]');
  await expect(inputs.nth(0)).toHaveAttribute('tabindex', '-1');
  await expect(inputs.nth(1)).toHaveAttribute('tabindex', '-1');
  const ordersPicker = page.locator('.file-intake--orders button');
  await ordersPicker.focus();
  await expect(ordersPicker).toBeFocused();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await ordersPicker.press('Enter');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(ordersPath);
  await inputs.nth(1).setInputFiles(productsPath);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Map source columns' })).toBeVisible();
  await page.getByRole('button', { name: 'Validate data' }).click();
  await expect(page.getByRole('heading', { name: 'Review validation results' })).toBeVisible();
  await page.getByRole('button', { name: 'Generate Excel report' }).click();
  const downloadLink = page.getByRole('link', { name: 'Download report' });
  await expect(downloadLink).toBeVisible({ timeout: 30_000 });

  const downloadPromise = page.waitForEvent('download');
  await downloadLink.click();
  const download = await downloadPromise;
  const outputPath = testInfo.outputPath('uploaded-source-report.xlsx');
  await download.saveAs(outputPath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputPath);
  expect(workbook.getWorksheet('Overview')!.getCell('B8').value).toBe(100);
  expect(workbook.getWorksheet('Processed Data')!.rowCount).toBe(9);
  expect(workbook.getWorksheet('Processed Data')!.getCell('S9').text).toContain('Pending orders');
});
