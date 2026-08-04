/**
 * Tilawa — Quran dataset generator.
 * -----------------------------------------------------------------------------
 * Produces the canonical, immutable datasets the application ships with:
 *
 *   src/data/chapters.json        114 surah records (metadata only)
 *   src/data/juz.json              30 juz boundaries
 *   src/data/hizb.json             60 hizb boundaries
 *   src/data/search-index.json     6236 lightweight verse records for search
 *   public/data/surah/{1..114}.json  full verse payloads, fetched on demand
 *
 * Sources
 *   • Uthmani text, transliteration and translations — `quran-json` (CC BY-SA 4.0)
 *     https://github.com/risan/quran-json
 *   • Structural metadata (juz / hizb / page / sajdah / ruku) — `quran-meta` (MIT)
 *     https://github.com/quran-center/quran-meta
 *
 * Usage
 *   npm run data:generate                     # pulls quran-json from jsDelivr
 *   QURAN_JSON_DIR=/path/to/dist npm run data:generate   # offline / vendored copy
 *
 * The generated files are committed to the repository so that installs stay
 * small and builds are fully deterministic and network-independent.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHafs } from 'quran-meta';

const QURAN_JSON_VERSION = '3.1.2';
const CDN_BASE = `https://cdn.jsdelivr.net/npm/quran-json@${QURAN_JSON_VERSION}/dist`;
const LOCAL_DIR = process.env.QURAN_JSON_DIR ?? null;

const ROOT = new URL('..', import.meta.url).pathname;
const SRC_DATA_DIR = join(ROOT, 'src', 'data');
const PUBLIC_DATA_DIR = join(ROOT, 'public', 'data');
const SURAH_DIR = join(PUBLIC_DATA_DIR, 'surah');

const TOTAL_SURAHS = 114;
const TOTAL_VERSES = 6236;
const TOTAL_JUZ = 30;
const TOTAL_HIZB = 60;
const RUB_PER_HIZB = 4;

/** Arabic-Indic digits, used for the ayah medallion numerals. */
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** @param {number} value */
function toArabicNumeral(value) {
  return String(value)
    .split('')
    .map((digit) => ARABIC_DIGITS[Number(digit)] ?? digit)
    .join('');
}

/**
 * Reads one of the quran-json dist files, either from a local checkout or the
 * pinned CDN release.
 * @param {string} relativePath
 * @returns {Promise<unknown>}
 */
async function loadSource(relativePath) {
  if (LOCAL_DIR) {
    const raw = await readFile(join(LOCAL_DIR, relativePath), 'utf8');
    return JSON.parse(raw);
  }

  const url = `${CDN_BASE}/${relativePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Normalises Arabic text for search: strips tashkeel, tatweel and Quranic
 * annotation marks, and unifies alef/ya/ta-marbuta variants. This mirrors the
 * runtime normaliser in `src/utils/arabic.ts` — keep the two in sync.
 * @param {string} text
 */
function normaliseArabic(text) {
  return text
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[آأإٱٲٳ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pretty, stable JSON output (newline-terminated for clean diffs). */
async function writeJson(path, data, { pretty = false } = {}) {
  const body = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await writeFile(path, `${body}\n`, 'utf8');
}

async function main() {
  const started = Date.now();
  console.log(`▸ Tilawa dataset generator (quran-json@${QURAN_JSON_VERSION})`);
  console.log(`  source: ${LOCAL_DIR ?? CDN_BASE}`);

  const hafs = createHafs();

  console.log('▸ Loading source data…');
  const [arabicChapters, englishIndex, englishChapters, transliterationChapters] = await Promise.all(
    [
      loadSource('chapters/index.json'),
      loadSource('chapters/en/index.json'),
      Promise.all(
        Array.from({ length: TOTAL_SURAHS }, (_, i) => loadSource(`chapters/en/${i + 1}.json`)),
      ),
      Promise.all(
        Array.from({ length: TOTAL_SURAHS }, (_, i) => loadSource(`chapters/${i + 1}.json`)),
      ),
    ],
  );

  const englishById = new Map(englishIndex.map((chapter) => [chapter.id, chapter]));
  const arabicById = new Map(arabicChapters.map((chapter) => [chapter.id, chapter]));

  await rm(SURAH_DIR, { recursive: true, force: true });
  await mkdir(SURAH_DIR, { recursive: true });
  await mkdir(SRC_DATA_DIR, { recursive: true });

  /** @type {unknown[]} */
  const chapters = [];
  /** @type {unknown[]} */
  const searchIndex = [];
  let verseTally = 0;

  console.log('▸ Building surah payloads…');
  for (let surahNumber = 1; surahNumber <= TOTAL_SURAHS; surahNumber += 1) {
    const meta = hafs.getSurahMeta(surahNumber);
    const arabic = arabicById.get(surahNumber);
    const english = englishById.get(surahNumber);
    const englishChapter = englishChapters[surahNumber - 1];
    const transliterationChapter = transliterationChapters[surahNumber - 1];

    if (!arabic || !english || !englishChapter || !transliterationChapter) {
      throw new Error(`Missing source data for surah ${surahNumber}`);
    }
    if (englishChapter.verses.length !== meta.ayahCount) {
      throw new Error(
        `Verse count mismatch for surah ${surahNumber}: ` +
          `source has ${englishChapter.verses.length}, quran-meta expects ${meta.ayahCount}`,
      );
    }

    const firstAyahMeta = hafs.getAyahMeta(meta.firstAyahId);
    const lastAyahMeta = hafs.getAyahMeta(meta.lastAyahId);

    const verses = englishChapter.verses.map((verse, index) => {
      const ayahNumber = index + 1;
      const ayahId = meta.firstAyahId + index;
      const ayahMeta = hafs.getAyahMeta(ayahId);
      const arabicText = transliterationChapter.verses[index]?.text ?? verse.text;
      const transliteration = transliterationChapter.verses[index]?.transliteration ?? '';

      verseTally += 1;

      searchIndex.push({
        i: ayahId,
        s: surahNumber,
        a: ayahNumber,
        n: normaliseArabic(arabicText),
        t: verse.translation,
      });

      return {
        id: ayahId,
        surah: surahNumber,
        ayah: ayahNumber,
        key: `${surahNumber}:${ayahNumber}`,
        numberInSurah: toArabicNumeral(ayahNumber),
        text: arabicText,
        transliteration,
        translation: verse.translation,
        page: ayahMeta.page,
        juz: ayahMeta.juz,
        hizb: ayahMeta.hizbId,
        rubAlHizb: ayahMeta.rubAlHizbId,
        ruku: ayahMeta.ruku,
        sajdah: ayahMeta.isSajdahAyah,
      };
    });

    const chapter = {
      id: surahNumber,
      name: meta.name,
      nameSimple: arabic.name,
      transliteration: english.transliteration,
      translation: english.translation,
      revelation: meta.isMeccan ? 'meccan' : 'medinan',
      revelationOrder: meta.surahOrder,
      versesCount: meta.ayahCount,
      rukuCount: meta.rukuCount,
      firstVerseId: meta.firstAyahId,
      lastVerseId: meta.lastAyahId,
      startPage: firstAyahMeta.page,
      endPage: lastAyahMeta.page,
      startJuz: firstAyahMeta.juz,
      endJuz: lastAyahMeta.juz,
      // Every surah opens with the Basmalah except Al-Fatihah (where it is the
      // first ayah) and At-Tawbah (where it is absent entirely).
      hasBasmalah: surahNumber !== 1 && surahNumber !== 9,
    };

    chapters.push(chapter);

    await writeJson(join(SURAH_DIR, `${surahNumber}.json`), { chapter, verses });
  }

  if (verseTally !== TOTAL_VERSES) {
    throw new Error(`Expected ${TOTAL_VERSES} verses, generated ${verseTally}`);
  }

  console.log('▸ Building juz boundaries…');
  const juzList = Array.from({ length: TOTAL_JUZ }, (_, index) => {
    const juzNumber = index + 1;
    const meta = hafs.getJuzMeta(juzNumber);
    const [firstSurah, firstAyah] = meta.first;
    const [lastSurah, lastAyah] = meta.last;
    return {
      id: juzNumber,
      name: `الجزء ${toArabicNumeral(juzNumber)}`,
      firstVerseId: meta.firstAyahId,
      lastVerseId: meta.lastAyahId,
      versesCount: meta.lastAyahId - meta.firstAyahId + 1,
      start: { surah: firstSurah, ayah: firstAyah },
      end: { surah: lastSurah, ayah: lastAyah },
      startPage: hafs.getAyahMeta(meta.firstAyahId).page,
      endPage: hafs.getAyahMeta(meta.lastAyahId).page,
      hizbs: [juzNumber * 2 - 1, juzNumber * 2],
    };
  });

  console.log('▸ Building hizb boundaries…');
  const hizbList = Array.from({ length: TOTAL_HIZB }, (_, index) => {
    const hizbNumber = index + 1;
    const firstRub = (hizbNumber - 1) * RUB_PER_HIZB + 1;
    const lastRub = hizbNumber * RUB_PER_HIZB;
    const firstMeta = hafs.getRubAlHizbMeta(firstRub);
    const lastMeta = hafs.getRubAlHizbMeta(lastRub);
    const [firstSurah, firstAyah] = firstMeta.first;
    const [lastSurah, lastAyah] = lastMeta.last;
    return {
      id: hizbNumber,
      name: `الحزب ${toArabicNumeral(hizbNumber)}`,
      juz: firstMeta.juz,
      firstVerseId: firstMeta.firstAyahId,
      lastVerseId: lastMeta.lastAyahId,
      versesCount: lastMeta.lastAyahId - firstMeta.firstAyahId + 1,
      start: { surah: firstSurah, ayah: firstAyah },
      end: { surah: lastSurah, ayah: lastAyah },
      startPage: hafs.getAyahMeta(firstMeta.firstAyahId).page,
      endPage: hafs.getAyahMeta(lastMeta.lastAyahId).page,
    };
  });

  // Structural sanity checks — the dataset is the foundation of the whole app,
  // a silent corruption here would be invisible until runtime.
  if (juzList[0].firstVerseId !== 1 || juzList[TOTAL_JUZ - 1].lastVerseId !== TOTAL_VERSES) {
    throw new Error('Juz boundaries do not span the whole Quran');
  }
  if (hizbList[0].firstVerseId !== 1 || hizbList[TOTAL_HIZB - 1].lastVerseId !== TOTAL_VERSES) {
    throw new Error('Hizb boundaries do not span the whole Quran');
  }
  for (let i = 1; i < TOTAL_JUZ; i += 1) {
    if (juzList[i].firstVerseId !== juzList[i - 1].lastVerseId + 1) {
      throw new Error(`Gap between juz ${i} and ${i + 1}`);
    }
  }
  for (let i = 1; i < TOTAL_HIZB; i += 1) {
    if (hizbList[i].firstVerseId !== hizbList[i - 1].lastVerseId + 1) {
      throw new Error(`Gap between hizb ${i} and ${i + 1}`);
    }
  }

  console.log('▸ Writing datasets…');
  await writeJson(join(SRC_DATA_DIR, 'chapters.json'), chapters, { pretty: true });
  await writeJson(join(SRC_DATA_DIR, 'juz.json'), juzList, { pretty: true });
  await writeJson(join(SRC_DATA_DIR, 'hizb.json'), hizbList, { pretty: true });
  await writeJson(join(SRC_DATA_DIR, 'search-index.json'), searchIndex);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `✔ Generated ${TOTAL_SURAHS} surahs, ${TOTAL_JUZ} juz, ${TOTAL_HIZB} hizb, ` +
      `${verseTally} verses in ${elapsed}s`,
  );
}

main().catch((error) => {
  console.error('✖ Dataset generation failed');
  console.error(error);
  process.exitCode = 1;
});
