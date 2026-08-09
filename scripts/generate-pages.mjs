/**
 * Tilawa — Mus'haf page index.
 * -----------------------------------------------------------------------------
 * Produces `src/data/pages.json`: the 604 pages of the standard Madani Mus'haf,
 * each with its verse range and the juz payloads it can be read from.
 *
 * Derived from the committed juz payloads rather than regenerated from source.
 * Every verse in `public/data/juz/*.json` already carries its `page`, so the
 * page boundaries are a grouping of data the repository holds — there is no new
 * fact here to fetch, and this script needs no network.
 *
 * Only boundaries are emitted, never verse text. A page is read by loading the
 * juz payload that contains it and filtering to the range, exactly as a hizb
 * already is: one request, and no second copy of the Mus'haf on disk.
 *
 * Usage:  npm run data:pages
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const JUZ_DIR = join(ROOT, 'public', 'data', 'juz');
const OUT = join(ROOT, 'src', 'data', 'pages.json');

const TOTAL_JUZ = 30;
const TOTAL_PAGES = 604;
const TOTAL_VERSES = 6236;

/** @type {Map<number, {verses: {id: number, surah: number, ayah: number}[], juz: Set<number>}>} */
const pages = new Map();

for (let juz = 1; juz <= TOTAL_JUZ; juz += 1) {
  const payload = JSON.parse(await readFile(join(JUZ_DIR, `${juz}.json`), 'utf8'));

  for (const verse of payload.verses) {
    let entry = pages.get(verse.page);
    if (!entry) {
      entry = { verses: [], juz: new Set() };
      pages.set(verse.page, entry);
    }
    // A verse spanning a juz boundary appears in both payloads; keep one copy.
    if (!entry.verses.some((existing) => existing.id === verse.id)) {
      entry.verses.push({ id: verse.id, surah: verse.surah, ayah: verse.ayah });
    }
    entry.juz.add(juz);
  }
}

const list = [];

for (let id = 1; id <= TOTAL_PAGES; id += 1) {
  const entry = pages.get(id);
  if (!entry) throw new Error(`Page ${id} has no verses — the juz payloads are incomplete`);

  const verses = entry.verses.sort((a, b) => a.id - b.id);
  const first = verses[0];
  const last = verses[verses.length - 1];

  list.push({
    id,
    firstVerseId: first.id,
    lastVerseId: last.id,
    versesCount: verses.length,
    start: { surah: first.surah, ayah: first.ayah },
    end: { surah: last.surah, ayah: last.ayah },
    // Sorted so the first entry is the payload most of the page lives in.
    juz: [...entry.juz].sort((a, b) => a - b),
    // Every surah appearing on the page, in order — a page can open in the
    // middle of one surah and close in the next.
    surahs: [...new Set(verses.map((verse) => verse.surah))],
  });
}

// ---------------------------------------------------------------------------
// Invariants — the generated file is committed, so it is checked here once
// rather than trusted forever.
// ---------------------------------------------------------------------------

if (list.length !== TOTAL_PAGES) {
  throw new Error(`Expected ${TOTAL_PAGES} pages, produced ${list.length}`);
}
if (list[0].firstVerseId !== 1) throw new Error('Page 1 must open at the first verse');
if (list[TOTAL_PAGES - 1].lastVerseId !== TOTAL_VERSES) {
  throw new Error('The last page must close at the last verse');
}

let covered = 0;
for (let index = 0; index < list.length; index += 1) {
  const page = list[index];
  covered += page.versesCount;

  if (page.lastVerseId < page.firstVerseId) {
    throw new Error(`Page ${page.id} ends before it begins`);
  }
  if (index > 0 && page.firstVerseId !== list[index - 1].lastVerseId + 1) {
    throw new Error(`Page ${page.id} does not continue from page ${page.id - 1}`);
  }
}

if (covered !== TOTAL_VERSES) {
  throw new Error(`Pages cover ${covered} verses, expected ${TOTAL_VERSES}`);
}

const spanningTwoJuz = list.filter((page) => page.juz.length > 1);

await writeFile(OUT, `${JSON.stringify(list, null, 2)}\n`, 'utf8');

console.log(
  `✔ Generated ${TOTAL_PAGES} pages covering ${covered} verses ` +
    `(${spanningTwoJuz.length} span two juz)`,
);
