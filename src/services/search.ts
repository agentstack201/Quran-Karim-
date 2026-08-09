import { DATA_ROUTES, SEARCH_MIN_LENGTH, SEARCH_RESULT_LIMIT } from '@/constants';
import { getChapter, getChapterByVerseId } from './quran';
import { normaliseArabic } from '@/utils';
import type { Result, SearchResponse, SearchResult } from '@/types';

/**
 * Full-text search over the Quran, in the browser.
 *
 * This used to run on the server, because a 3 MB index "belongs on the server".
 * That reasoning held only as long as the index had to be 3 MB. Split by script
 * and stored columnar it is 2.0 MB of Arabic — 550 kB over the wire once, then
 * cached immutably and never fetched again.
 *
 * Paying that once buys three things a server route cannot:
 *
 *   • search works offline, which for a Quran app is not a nicety — a reader
 *     looking for an ayah on a plane is the same reader who needed it at home;
 *   • results are instant, with no network round-trip per keystroke;
 *   • the application has no server at all, so hosting it costs nothing and
 *     keeps costing nothing however many people read.
 *
 * The index is fetched lazily on the first query, so a visitor who never
 * searches never downloads it, and the two halves load independently: an Arabic
 * query never pulls the English column.
 */

/** Schema version this client understands. A mismatch is treated as no index. */
const SEARCH_INDEX_VERSION = 1;

const AR_INDEX_URL = DATA_ROUTES.searchArabic;
const EN_INDEX_URL = DATA_ROUTES.searchEnglish;

/**
 * The Arabic half: normalised text for matching, Uthmani text for display.
 * Both arrays are positional — entry `k` is the ayah with global id `k + 1`.
 */
type ArabicIndex = {
  readonly version: number;
  readonly count: number;
  readonly n: readonly string[];
  readonly o: readonly string[];
};

/** The English half: translations, on the same positional scheme. */
type EnglishIndex = {
  readonly version: number;
  readonly count: number;
  readonly t: readonly string[];
};

/**
 * In-flight and settled loads, so a burst of keystrokes issues one request.
 * Kept as the promise rather than the value, which is what makes that true.
 */
let arabicRequest: Promise<Result<ArabicIndex>> | null = null;
let englishRequest: Promise<Result<EnglishIndex>> | null = null;

/** Lower-cased translations, derived once per load rather than once per query. */
let translationsLower: readonly string[] | null = null;

function isArabicIndex(value: unknown): value is ArabicIndex {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ArabicIndex>;
  return (
    candidate.version === SEARCH_INDEX_VERSION &&
    Array.isArray(candidate.n) &&
    Array.isArray(candidate.o) &&
    candidate.n.length === candidate.o.length &&
    candidate.n.length > 0
  );
}

function isEnglishIndex(value: unknown): value is EnglishIndex {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<EnglishIndex>;
  return (
    candidate.version === SEARCH_INDEX_VERSION &&
    Array.isArray(candidate.t) &&
    candidate.t.length > 0
  );
}

/**
 * Fetches one half of the index.
 *
 * Memoised on the promise, and the memo is cleared on failure so a flaky
 * connection cannot make search permanently unavailable for the session.
 */
async function loadIndex<T>(
  url: string,
  validate: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<Result<T>> {
  try {
    const response = await fetch(url, { signal: signal ?? null, cache: 'force-cache' });
    if (!response.ok) {
      return { ok: false, error: `تعذّر تحميل فهرس البحث (${response.status})` };
    }

    const payload: unknown = await response.json();
    if (!validate(payload)) {
      return { ok: false, error: 'فهرس البحث غير صالح' };
    }

    return { ok: true, data: payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, error: 'تم إلغاء الطلب' };
    }
    return { ok: false, error: 'تعذّر تحميل فهرس البحث. تحقّق من الإنترنت.' };
  }
}

function loadArabicIndex(signal?: AbortSignal): Promise<Result<ArabicIndex>> {
  if (arabicRequest) return arabicRequest;

  const request = loadIndex(AR_INDEX_URL, isArabicIndex, signal).then((result) => {
    if (!result.ok) arabicRequest = null;
    return result;
  });

  arabicRequest = request;
  return request;
}

function loadEnglishIndex(signal?: AbortSignal): Promise<Result<EnglishIndex>> {
  if (englishRequest) return englishRequest;

  const request = loadIndex(EN_INDEX_URL, isEnglishIndex, signal).then((result) => {
    if (!result.ok) englishRequest = null;
    else translationsLower = result.data.t.map((text) => text.toLowerCase());
    return result;
  });

  englishRequest = request;
  return request;
}

/**
 * True once a query can be answered without touching the network.
 *
 * Lets the UI distinguish "offline and the index never loaded" from "offline
 * but everything needed is already here" — the second is the common case after
 * one visit, and telling the reader search is unavailable when it isn't would
 * be a worse lie than saying nothing.
 */
export function isSearchIndexResident(): boolean {
  return arabicRequest !== null;
}

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

/** A hit before its display fields are resolved. */
type ScoredHit = {
  /** Zero-based position in the index, so `verseId` is this plus one. */
  readonly at: number;
  readonly matchedIn: 'arabic' | 'translation';
  readonly score: number;
};

/**
 * Runs a search.
 *
 * Loads whichever halves of the index the query actually needs, then scans
 * them. Over 6236 short strings a substring scan is well under a millisecond,
 * which is why there is no inverted index here: it would cost memory and build
 * time to speed up something already imperceptible.
 *
 * @param rawQuery The user's query, in Arabic or English.
 * @param limit Maximum results to return.
 */
export async function searchVerses(
  rawQuery: string,
  limit: number = SEARCH_RESULT_LIMIT,
  signal?: AbortSignal,
): Promise<Result<SearchResponse>> {
  const query = rawQuery.trim();
  const empty: SearchResponse = { query, total: 0, results: [], truncated: false };

  if (query.length < SEARCH_MIN_LENGTH) return { ok: true, data: empty };

  const arabicNeedle = normaliseArabic(query);
  const latinNeedle = query.toLowerCase();
  const searchArabic = arabicNeedle.length >= SEARCH_MIN_LENGTH;
  // Only search translations for Latin input; an Arabic query would otherwise
  // download 280 kB of English to scan it for nothing.
  const searchTranslation = /[a-z]/i.test(query) && latinNeedle.length >= SEARCH_MIN_LENGTH;

  if (!searchArabic && !searchTranslation) return { ok: true, data: empty };

  const [arabic, english] = await Promise.all([
    searchArabic ? loadArabicIndex(signal) : null,
    searchTranslation ? loadEnglishIndex(signal) : null,
  ]);

  if (arabic && !arabic.ok) return arabic;
  if (english && !english.ok) return english;

  const normalised = arabic?.ok ? arabic.data.n : null;
  const uthmani = arabic?.ok ? arabic.data.o : null;
  const translations = english?.ok ? english.data.t : null;
  const lowered = english?.ok ? translationsLower : null;

  const total = normalised?.length ?? translations?.length ?? 0;
  const scored: ScoredHit[] = [];

  for (let at = 0; at < total; at += 1) {
    if (normalised) {
      const haystack = normalised[at];
      if (haystack !== undefined) {
        const position = haystack.indexOf(arabicNeedle);
        if (position !== -1) {
          scored.push({
            at,
            matchedIn: 'arabic',
            score: score(
              haystack,
              arabicNeedle,
              position,
              isWordBoundaryMatch(haystack, arabicNeedle, position),
            ),
          });
          continue;
        }
      }
    }

    if (lowered) {
      const haystack = lowered[at];
      if (haystack === undefined) continue;
      const position = haystack.indexOf(latinNeedle);
      if (position !== -1) {
        scored.push({
          at,
          matchedIn: 'translation',
          score: score(
            haystack,
            latinNeedle,
            position,
            isWordBoundaryMatch(haystack, latinNeedle, position),
          ),
        });
      }
    }
  }

  scored.sort((a, b) =>
    // Ties resolve to Mus'haf order, so results always read in a familiar
    // sequence rather than an arbitrary one.
    b.score === a.score ? a.at - b.at : b.score - a.score,
  );

  const results: SearchResult[] = [];

  for (const hit of scored.slice(0, limit)) {
    const verseId = hit.at + 1;
    const chapter = getChapterByVerseId(verseId);
    if (!chapter) continue;

    results.push({
      verseId,
      surah: chapter.id,
      // Ayah numbers restart at every surah, so the position within the
      // chapter is what the index's positional scheme actually encodes.
      ayah: verseId - chapter.firstVerseId + 1,
      key: `${chapter.id}:${verseId - chapter.firstVerseId + 1}`,
      surahName: getChapter(chapter.id)?.name ?? '',
      text: uthmani?.[hit.at] ?? '',
      translation: translations?.[hit.at] ?? '',
      matchedIn: hit.matchedIn,
      score: hit.score,
    });
  }

  return {
    ok: true,
    data: { query, total: scored.length, results, truncated: scored.length > results.length },
  };
}

/**
 * Discards the loaded index. Tests only — the browser never needs this, since
 * the index is immutable for the lifetime of a deployment.
 */
export function resetSearchIndex(): void {
  arabicRequest = null;
  englishRequest = null;
  translationsLower = null;
}
