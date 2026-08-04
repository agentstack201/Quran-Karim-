/**
 * Tilawa — font vendoring script.
 * -----------------------------------------------------------------------------
 * Downloads the Amiri and Cairo webfonts from Google Fonts and writes them into
 * `public/fonts/` so the application can self-host them via `next/font/local`.
 *
 * Self-hosting is a deliberate choice:
 *   • no third-party origin at build or runtime (`font-src 'self'` in the CSP)
 *   • fonts are available offline from the very first service-worker precache
 *   • builds never fail because fonts.googleapis.com is unreachable
 *
 * Only the Arabic and Latin subsets are kept — the app never renders Cyrillic,
 * Greek or Vietnamese text, so shipping those subsets would be dead weight.
 *
 * Usage:  npm run fonts:fetch
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const FONT_DIR = join(ROOT, 'public', 'fonts');

/** Chrome UA — Google Fonts serves woff2 only to browsers that advertise support. */
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Subsets we actually render. Everything else is discarded. */
const KEPT_SUBSETS = new Set(['arabic', 'latin', 'latin-ext']);

/**
 * @typedef {object} FontRequest
 * @property {string} family      Google Fonts family name
 * @property {string} slug        File-name prefix
 * @property {string} query       Google Fonts `family=` query fragment
 */

/** @type {FontRequest[]} */
const FONTS = [
  { family: 'Amiri', slug: 'amiri', query: 'Amiri:wght@400;700' },
  { family: 'Cairo', slug: 'cairo', query: 'Cairo:wght@400..700' },
];

/**
 * Parses a Google Fonts CSS payload into structured @font-face records.
 * The payload is a predictable sequence of `/* subset *\/` comments followed by
 * one @font-face block each, which makes a small hand-rolled parser both safe
 * and dependency-free.
 * @param {string} css
 */
function parseFontFaces(css) {
  /** @type {{ subset: string, weight: string, style: string, url: string, unicodeRange: string }[]} */
  const faces = [];
  const blockPattern = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;

  for (const match of css.matchAll(blockPattern)) {
    const subset = match[1];
    const body = match[2];
    if (!subset || !body) continue;

    const weight = /font-weight:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? '400';
    const style = /font-style:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? 'normal';
    const url = /url\((https:\/\/[^)]+)\)/.exec(body)?.[1];
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? '';

    if (!url) continue;
    faces.push({ subset, weight, style, url, unicodeRange });
  }

  return faces;
}

async function main() {
  await mkdir(FONT_DIR, { recursive: true });

  /** @type {string[]} */
  const manifest = [];
  let downloaded = 0;

  for (const font of FONTS) {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.query).replace(/%3A/g, ':').replace(/%40/g, '@').replace(/%3B/g, ';')}&display=swap`;
    console.log(`▸ ${font.family}`);

    const response = await fetch(cssUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`Failed to fetch CSS for ${font.family}: ${response.status}`);
    }

    const faces = parseFontFaces(await response.text());
    const kept = faces.filter((face) => KEPT_SUBSETS.has(face.subset));

    if (kept.length === 0) {
      throw new Error(`No usable subsets found for ${font.family}`);
    }

    for (const face of kept) {
      const weightSlug = face.weight.replace(/\s+/g, '-');
      const fileName = `${font.slug}-${face.subset}-${weightSlug}.woff2`;
      const target = join(FONT_DIR, fileName);

      const binary = await fetch(face.url, { headers: { 'User-Agent': USER_AGENT } });
      if (!binary.ok) {
        throw new Error(`Failed to download ${face.url}: ${binary.status}`);
      }

      const buffer = Buffer.from(await binary.arrayBuffer());
      await writeFile(target, buffer);
      downloaded += 1;

      manifest.push(
        `${font.family} · ${face.subset} · ${face.weight} · ${(buffer.byteLength / 1024).toFixed(1)} kB → ${fileName}`,
      );
      console.log(`  ✓ ${fileName} (${(buffer.byteLength / 1024).toFixed(1)} kB)`);
    }
  }

  await writeFile(
    join(FONT_DIR, 'README.md'),
    [
      '# Vendored webfonts',
      '',
      'These files are downloaded from Google Fonts by `npm run fonts:fetch`',
      'and committed so the application never depends on a third-party origin.',
      '',
      'Both families are licensed under the SIL Open Font License 1.1:',
      '',
      '- **Amiri** — <https://fonts.google.com/specimen/Amiri> (Quranic text)',
      '- **Cairo** — <https://fonts.google.com/specimen/Cairo> (interface)',
      '',
      '## Contents',
      '',
      ...manifest.map((line) => `- ${line}`),
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(`✔ Vendored ${downloaded} font files into public/fonts/`);
}

main().catch((error) => {
  console.error('✖ Font vendoring failed');
  console.error(error);
  process.exitCode = 1;
});
