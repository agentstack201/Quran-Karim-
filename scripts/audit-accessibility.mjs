/**
 * Tilawa — accessibility audit.
 * -----------------------------------------------------------------------------
 * Drives the production build in a real browser and runs axe-core against every
 * route, in both themes, on all three light surfaces, and inside every dialog.
 * Exits non-zero on a single WCAG 2.2 AA violation.
 *
 * This exists because accessibility claims that are not measured are not
 * claims. The first time this ran it found 15 violations — including an ayah
 * reference at a 1.6:1 contrast ratio and duplicate landmarks emitted by the
 * dialog portal — none of which were visible by reading the code.
 *
 * Usage:
 *   npm run build && npm start &
 *   npm run audit:a11y
 *
 * Environment:
 *   BASE_URL   defaults to http://127.0.0.1:3000
 *   CHROME_PATH  overrides the browser executable
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

/** The rule sets we hold the app to. */
const AXE_OPTIONS = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  },
};

const ROUTES = [
  '/',
  '/surah',
  '/surah/1',
  '/surah/2',
  '/juz',
  '/juz/30',
  '/hizb',
  '/hizb/1',
  '/search',
  '/bookmarks',
  '/about',
  '/offline',
  // An id outside 1–114, to reach the not-found page.
  '/surah/999',
];

/** Appearance combinations. Contrast is a property of the pair, not the colour. */
const APPEARANCES = [
  { label: 'light/paper', settings: { theme: 'light', surface: 'paper' } },
  { label: 'light/beige', settings: { theme: 'light', surface: 'beige' } },
  { label: 'light/white', settings: { theme: 'light', surface: 'white' } },
  { label: 'dark', settings: { theme: 'dark', surface: 'paper' } },
];

let violationCount = 0;
const failures = [];

/**
 * Forces every verse to lay out, for the duration of the audit only.
 *
 * Verses below the fold carry `content-visibility: auto`, which lets the
 * browser skip their layout entirely while they are off-screen. That is a
 * rendering optimisation with no effect on semantics — the accessibility tree
 * and find-in-page still reach the content — but axe measures *geometry*, and
 * geometry is exactly what the optimisation defers.
 *
 * Left in place, it reported the ayah action buttons as 32×4 targets. They are
 * 32×32, and pass cleanly the moment the browser lays them out; scrolling to
 * one and re-running the rule confirms it. So the audit disables the
 * optimisation and measures what a reader actually reaches.
 */
async function forceLayout(page) {
  await page.addStyleTag({
    content: '.verse-block { content-visibility: visible !important; }',
  });
  // One frame for the forced layout to settle before anything is measured.
  await page.waitForTimeout(250);
}

/** Runs axe against whatever is currently rendered. */
async function audit(page, label) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(
    async (options) => window.axe.run(document, options),
    AXE_OPTIONS,
  );

  if (result.violations.length === 0) {
    console.log(`  ✓ ${label}`);
    return;
  }

  violationCount += result.violations.length;
  console.log(`  ✖ ${label} — ${result.violations.length} violation(s)`);

  for (const violation of result.violations) {
    console.log(`      [${violation.impact}] ${violation.id}: ${violation.help}`);
    for (const node of violation.nodes.slice(0, 3)) {
      console.log(`        ${node.target.join(' ')}`);
      const summary = node.failureSummary?.split('\n').filter(Boolean).slice(1, 3).join(' / ');
      if (summary) console.log(`        → ${summary}`);
    }
    if (violation.nodes.length > 3) {
      console.log(`        … and ${violation.nodes.length - 3} more element(s)`);
    }
    failures.push(`${label}: ${violation.id}`);
  }
}

/** Applies a stored appearance, then loads the route fresh so it takes effect. */
async function openWithAppearance(context, path, settings) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (value) => localStorage.setItem('tilawa:settings', JSON.stringify(value)),
    settings,
  );
  await page.goto(BASE_URL + path, { waitUntil: 'networkidle', timeout: 45_000 });
  // Verses load on the client; give them a moment to paint before auditing.
  await page.waitForTimeout(800);
  await forceLayout(page);
  return page;
}

async function main() {
  console.log(`▸ Accessibility audit against ${BASE_URL}\n`);

  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  console.log('Routes (default appearance)');
  for (const path of ROUTES) {
    const page = await openWithAppearance(context, path, APPEARANCES[0].settings);
    await audit(page, path);
    await page.close();
  }

  console.log('\nAppearances (reading page)');
  for (const appearance of APPEARANCES) {
    const page = await openWithAppearance(context, '/surah/2', appearance.settings);
    await audit(page, appearance.label);
    await page.close();
  }

  console.log('\nDialogs');
  {
    const page = await openWithAppearance(context, '/surah/1', APPEARANCES[0].settings);

    await page.getByRole('button', { name: 'الإعدادات' }).first().click();
    await page.waitForTimeout(500);
    await audit(page, 'settings dialog');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'بحث' }).first().click();
    await page.waitForTimeout(400);
    await page.keyboard.type('الرحمن');
    await page.waitForTimeout(1200);
    await audit(page, 'search palette');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'عرض التفسير والترجمة' }).first().click();
    await page.waitForTimeout(1500);
    await audit(page, 'ayah dialog');

    await page.close();
  }

  await browser.close();

  console.log('');
  if (violationCount === 0) {
    console.log('✔ No WCAG 2.2 AA violations');
    return;
  }

  console.log(`✖ ${violationCount} violation(s) across ${new Set(failures).size} rule(s)`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('✖ Accessibility audit failed to run');
  console.error(error);
  process.exitCode = 1;
});
