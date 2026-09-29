import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const outputPath = resolve('.impeccable/review/hero-repro.png');
await mkdir(dirname(outputPath), { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
});

try {
  const page = await browser.newPage({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    viewport: { width: 1586, height: 992 },
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log(outputPath);
} finally {
  await browser.close();
}
