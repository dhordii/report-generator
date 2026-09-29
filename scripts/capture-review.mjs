import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.REPORT_GENERATOR_URL ?? 'http://127.0.0.1:4173';
const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outputDirectory = '.impeccable/review';
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const findings = [];

async function capture(name, viewport, prepare) {
  const page = await browser.newPage({ viewport });
  page.on('console', (message) => {
    if (message.type() === 'error') findings.push(`${name} console: ${message.text()}`);
  });
  page.on('pageerror', (error) => findings.push(`${name} page: ${error.message}`));
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (prepare) await prepare(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const overflow = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  if (overflow.scrollWidth > overflow.width) findings.push(`${name} horizontal overflow: ${overflow.scrollWidth}px at ${overflow.width}px`);
  await page.screenshot({ path: `${outputDirectory}/${name}.png`, fullPage: true, animations: 'disabled' });
  await page.close();
}

async function openReview(page, showEditor = false) {
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await page.getByRole('button', { name: 'Validate data' }).click();
  if (showEditor) {
    await page.getByRole('row', { name: /Quantity must be a number greater than zero/ }).getByRole('button', { name: 'Edit value' }).click();
  }
}

await capture('review-desktop', { width: 1440, height: 1000 }, async (page) => openReview(page, true));
await capture('review-mobile', { width: 390, height: 844 }, async (page) => openReview(page, true));
await capture('review-dark', { width: 1440, height: 1000 }, async (page) => {
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await openReview(page, true);
});
await capture('report', { width: 1440, height: 1000 }, async (page) => {
  await openReview(page);
  await page.getByRole('checkbox', { name: /Generate from valid rows/ }).check();
  await page.getByRole('button', { name: 'Generate Excel report' }).click();
  await page.getByRole('link', { name: 'Download report' }).waitFor({ timeout: 30_000 });
});

await browser.close();
console.log(JSON.stringify({ captures: ['review-desktop.png', 'review-mobile.png', 'review-dark.png', 'report.png'], findings }, null, 2));
