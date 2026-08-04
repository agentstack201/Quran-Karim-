import 'server-only';

import searchIndex from '@/data/search-index.json';
import { SEARCH_MIN_LENGTH, SEARCH_RESULT_LIMIT } from '@/constants';
import { getChapter } from './quran';
import { normaliseArabic } from '@/utils';
import type { SearchResponse, SearchResult } from '@/types';

/**
 * Full-text search over the Quran.
 *
 * Server-only by construction — the index is ~3 MB and must never enter a
 * client bundle (`import 'server-only'` turns a mistaken client import into a
 * build error, and an ESLint rule catches it earlier still). Running the search
 * on the server also means the browser downloads only the handful of matches it
 * will actually display.
 *
 * The index stores each verse's Arabic already normalised, so a query is
 * normalised once and then matched with plain substring scans — over 6236 short
 * strings this is well under a millisecond, and it avoids the memory and cold
 * start cost of a full inverted index for a corpus this size.
 */

type IndexedVerse = {
  /** Global verse id. */
  readonly i: number;
  /** Surah number. */
  readonly s: number;
  /** Ayah number. */
  readonly a: number;
  /** Normalised Arabic text, used for matching. */
  readonly n: string;
  /** Uthmani text with full vocalisation, used for display. */
  readonly o: string;
  /** English translation. */
  readonly t: string;
};

const INDEX = searchIndex as readonly IndexedVerse[];

/** Lower-cased translations, computed once so each query avoids 6236 allocations. */
const TRANSLATIONS_LOWER: readonly string[] = INDEX.map((entry) => entry.t.toLowerCase());

/**
 * Scores a hit.
 *
 * Earlier matches and matches in shorter verses rank higher: in practice the
 * verse a user is looking for is the one where their phrase is most prominent,
 * not merely present.
 */
function score(haystack: string, needle: string, position: number, exactWord: boolean): number {
  const positionScore = 1 - position / Math.max(haystack.length, 1);
  const densityScore = needle.length / Math.max(haystack.length, 1);
  return (exactWord ? 2 : 1) + positionScore * 0.6 + densityScore * 0.4;
}

/** True when the match at `position` begins and ends on a word boundary. */
function isWordBoundaryMatch(haystack: string, needle: string, position: number): boolean {
  const before = position === 0 ? ' ' : haystack[position - 1];
  const afterIndex = position + needle.length;
  const after = afterIndex >= haystack.length ? ' ' : haystack[afterIndex];
  return before === ' ' && after === ' ';
}

/**
 * Runs a search.
 *
 * @param rawQuery The user's query, in Arabic or English.
 * @param limit Maximum results to return.
 */
export function searchVerses(
  rawQuery: string,
  limit: number = SEARCH_RESULT_LIMIT,
): SearchResponse {
  const query = rawQuery.trim();

  if (query.length < SEARCH_MIN_LENGTH) {
    return { query, total: 0, results: [], truncated: false };
  }

  const arabicNeedle = normaliseArabic(query);
  const latinNeedle = query.toLowerCase();
  const searchArabic = arabicNeedle.length >= SEARCH_MIN_LENGTH;
  // Only search translations for Latin input; an Arabic query would otherwise
  // scan 6236 English strings for nothing.
  const searchTranslation = /[a-z]/i.test(query) && latinNeedle.length >= SEARCH_MIN_LENGTH;

  if (!searchArabic && !searchTranslation) {
    return { query, total: 0, results: [], truncated: false };
  }

  const scored: { entry: IndexedVerse; result: Omit<SearchResult, 'surahName' | 'text'> }[] = [];

  for (let index = 0; index < INDEX.length; index += 1) {
    const entry = INDEX[index];
    if (!entry) continue;

    if (searchArabic) {
      const position = entry.n.indexOf(arabicNeedle);
      if (position !== -1) {
        scored.push({
          entry,
          result: {
            verseId: entry.i,
            surah: entry.s,
            ayah: entry.a,
            key: `${entry.s}:${entry.a}`,
            translation: entry.t,
            matchedIn: 'arabic',
            score: score(
              entry.n,
              arabicNeedle,
              position,
              isWordBoundaryMatch(entry.n, arabicNeedle, position),
            ),
          },
        });
        continue;
      }
    }

    if (searchTranslation) {
      const translation = TRANSLATIONS_LOWER[index];
      if (!translation) continue;
      const position = translation.indexOf(latinNeedle);
      if (position !== -1) {
        scored.push({
          entry,
          result: {
            verseId: entry.i,
            surah: entry.s,
            ayah: entry.a,
            key: `${entry.s}:${entry.a}`,
            translation: entry.t,
            matchedIn: 'translation',
            score: score(
              translation,
              latinNeedle,
              position,
              isWordBoundaryMatch(translation, latinNeedle, position),
            ),
          },
        });
      }
    }
  }

  const total = scored.length;

  scored.sort((a, b) =>
    // Ties resolve to Mus'haf order, so results always read in a familiar
    // sequence rather than an arbitrary one.
    b.result.score === a.result.score
      ? a.result.verseId - b.result.verseId
      : b.result.score - a.result.score,
  );

  const results: SearchResult[] = [];
  for (const item of scored.slice(0, limit)) {
    const chapter = getChapter(item.entry.s);
    results.push({
      ...item.result,
      surahName: chapter?.name ?? '',
      text: item.entry.o,
    });
  }

  return { query, total, results, truncated: total > results.length };
}
