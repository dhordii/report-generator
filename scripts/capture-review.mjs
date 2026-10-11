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
  const sectionOverlap = await page.evaluate(() => {
    const sampleAction = document.querySelector('.r-sample-action')?.getBoundingClientRect();
    const progressRail = document.querySelector('.r-progress-rail')?.getBoundingClientRect();
    return sampleAction && progressRail && sampleAction.bottom > progressRail.top + 1
      ? Math.round(sampleAction.bottom - progressRail.top)
      : 0;
  });
  if (sectionOverlap > 0) findings.push(`${name} intake overlaps progress rail by ${sectionOverlap}px`);
  const issuesLayout = await page.evaluate(() => {
    const wrap = document.querySelector('.issues-table-wrap');
    const actions = document.querySelector('.correction-editor__actions');
    if (!wrap) return null;
    const wrapRect = wrap.getBoundingClientRect();
    const actionsRect = actions?.getBoundingClientRect();
    return {
      overflow: wrap.scrollWidth - wrap.clientWidth,
      clippedActions: actionsRect
        ? Math.max(0, actionsRect.right - wrapRect.right, wrapRect.left - actionsRect.left)
        : 0,
    };
  });
  if (issuesLayout && issuesLayout.overflow <= 1 && issuesLayout.clippedActions > 1) findings.push(`${name} correction actions clipped by ${Math.round(issuesLayout.clippedActions)}px`);
  if (name === 'review-laptop' && issuesLayout?.overflow > 1) findings.push(`${name} issues table overflows by ${issuesLayout.overflow}px`);
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

await capture('hero-1024', { width: 1024, height: 768 });
await capture('hero-1280', { width: 1280, height: 800 });
await capture('hero-1366', { width: 1366, height: 768 });
await capture('hero-1440', { width: 1440, height: 1000 });
await capture('hero-1920', { width: 1920, height: 1080 });
await capture('hero-2560', { width: 2560, height: 1440 });
await capture('hero-3440', { width: 3440, height: 1440 });
await capture('review-tablet', { width: 1024, height: 768 }, async (page) => openReview(page, true));
await capture('review-laptop', { width: 1280, height: 800 }, async (page) => openReview(page, true));
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
console.log(JSON.stringify({
  captures: [
    'hero-1024.png',
    'hero-1280.png',
    'hero-1366.png',
    'hero-1440.png',
    'hero-1920.png',
    'hero-2560.png',
    'hero-3440.png',
    'review-tablet.png',
    'review-laptop.png',
    'review-desktop.png',
    'review-mobile.png',
    'review-dark.png',
    'report.png',
  ],
  findings,
}, null, 2));
if (findings.length > 0) process.exitCode = 1;
