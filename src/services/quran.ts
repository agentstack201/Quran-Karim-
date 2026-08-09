import chaptersData from '@/data/chapters.json';
import hizbData from '@/data/hizb.json';
import juzData from '@/data/juz.json';
import pagesData from '@/data/pages.json';
import { DATA_ROUTES } from '@/constants';
import type {
  Chapter,
  ChapterWithVerses,
  Hizb,
  Juz,
  Page,
  Result,
  Verse,
  VerseRange,
  VerseRef,
} from '@/types';

/**
 * Quran data access.
 *
 * Chapter, juz and hizb metadata is bundled — it is a few dozen kilobytes,
 * never changes, and having it available synchronously means navigation,
 * search-by-name and page metadata need no network at all.
 *
 * Verse text is fetched per surah from `/data/surah/{id}.json`, so the client
 * only ever downloads the surah being read, and the service worker turns each
 * one into a permanently offline-available asset after the first visit.
 *
 * Juz and hizb reading is served by pre-sliced `/data/juz/{id}.json` payloads.
 * Assembling a juz from its constituent surahs instead would mean 37 parallel
 * requests for juz 30, and downloading all of Al-Baqarah to read the 141 verses
 * that juz 1 actually contains. Every hizb falls inside exactly one juz, so a
 * hizb reuses its juz payload and filters the range — one request either way.
 */

export const CHAPTERS = chaptersData as readonly Chapter[];
export const JUZ_LIST = juzData as readonly Juz[];
export const HIZB_LIST = hizbData as readonly Hizb[];
export const PAGE_LIST = pagesData as readonly Page[];

/** Lookup by surah number, built once at module load. */
const CHAPTER_BY_ID = new Map<number, Chapter>(CHAPTERS.map((chapter) => [chapter.id, chapter]));

/** Pages are addressed by number far more often than the parts are. */
const PAGE_BY_ID = new Map<number, Page>(PAGE_LIST.map((page) => [page.id, page]));

/** In-flight and completed surah requests, so a surah is fetched at most once. */
const surahCache = new Map<number, Promise<Result<ChapterWithVerses>>>();

/** The same memoisation for juz payloads. */
const juzCache = new Map<number, Promise<Result<readonly Verse[]>>>();

export function getChapter(id: number): Chapter | null {
  return CHAPTER_BY_ID.get(id) ?? null;
}

export function getJuz(id: number): Juz | null {
  return JUZ_LIST.find((juz) => juz.id === id) ?? null;
}

export function getHizb(id: number): Hizb | null {
  return HIZB_LIST.find((hizb) => hizb.id === id) ?? null;
}

/** Resolves the chapter containing a global verse id (1–6236). */
export function getChapterByVerseId(verseId: number): Chapter | null {
  return (
    CHAPTERS.find((chapter) => verseId >= chapter.firstVerseId && verseId <= chapter.lastVerseId) ??
    null
  );
}

/** True when `id` is a valid surah number. */
export function isValidChapterId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= 114;
}

export function isValidJuzId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= 30;
}

export function isValidHizbId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= 60;
}

export function getPage(id: number): Page | null {
  return PAGE_BY_ID.get(id) ?? null;
}

export function isValidPageId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= 604;
}

/**
 * Resolves the Mus'haf page a global verse id sits on.
 *
 * Binary search rather than a scan: this runs on every scroll tick that moves
 * a khatmah's progress forward, and 604 comparisons per tick would be work for
 * nothing when nine will do.
 */
export function getPageByVerseId(verseId: number): Page | null {
  let low = 0;
  let high = PAGE_LIST.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const page = PAGE_LIST[middle];
    if (!page) break;

    if (verseId < page.firstVerseId) high = middle - 1;
    else if (verseId > page.lastVerseId) low = middle + 1;
    else return page;
  }

  return null;
}

/** Runtime shape check for a fetched surah payload. */
function isChapterWithVerses(value: unknown): value is ChapterWithVerses {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { chapter?: unknown; verses?: unknown };
  if (typeof candidate.chapter !== 'object' || candidate.chapter === null) return false;
  if (!Array.isArray(candidate.verses) || candidate.verses.length === 0) return false;
  const first: unknown = candidate.verses[0];
  return typeof first === 'object' && first !== null && 'text' in first && 'key' in first;
}

/**
 * Loads a surah with all of its verses.
 *
 * Never throws: callers receive a `Result` and render an error state. The
 * promise is memoised per surah so a reader that mounts several components
 * against the same surah issues one request.
 */
export async function fetchChapter(
  id: number,
  signal?: AbortSignal,
): Promise<Result<ChapterWithVerses>> {
  if (!isValidChapterId(id)) {
    return { ok: false, error: 'رقم السورة غير صحيح' };
  }

  const cached = surahCache.get(id);
  if (cached) return cached;

  const request = (async (): Promise<Result<ChapterWithVerses>> => {
    try {
      const response = await fetch(DATA_ROUTES.surah(id), {
        signal: signal ?? null,
        // The payload is immutable, so the HTTP cache is exactly the right
        // place for it — no revalidation round-trip on repeat reads.
        cache: 'force-cache',
      });

      if (!response.ok) {
        return { ok: false, error: `تعذّر تحميل السورة (${response.status})` };
      }

      const payload: unknown = await response.json();
      if (!isChapterWithVerses(payload)) {
        return { ok: false, error: 'بيانات السورة غير صالحة' };
      }

      return { ok: true, data: payload };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { ok: false, error: 'تم إلغاء الطلب' };
      }
      return { ok: false, error: 'تعذّر الاتصال. تحقّق من الإنترنت ثم أعد المحاولة.' };
    }
  })();

  surahCache.set(id, request);

  // A failure must not be cached, otherwise a single flaky request would make
  // the surah permanently unreadable for this session.
  const result = await request;
  if (!result.ok) surahCache.delete(id);

  return result;
}

/** Runtime shape check for a fetched juz payload. */
function isJuzPayload(value: unknown): value is { verses: readonly Verse[] } {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { verses?: unknown };
  if (!Array.isArray(candidate.verses) || candidate.verses.length === 0) return false;
  const first: unknown = candidate.verses[0];
  return typeof first === 'object' && first !== null && 'text' in first && 'key' in first;
}

/**
 * Loads the verses of one juz.
 *
 * Memoised per juz, and failures are evicted so a single flaky request cannot
 * make a juz permanently unreadable for the session.
 */
export async function fetchJuzVerses(
  id: number,
  signal?: AbortSignal,
): Promise<Result<readonly Verse[]>> {
  if (!isValidJuzId(id)) {
    return { ok: false, error: 'رقم الجزء غير صحيح' };
  }

  const cached = juzCache.get(id);
  if (cached) return cached;

  const request = (async (): Promise<Result<readonly Verse[]>> => {
    try {
      const response = await fetch(DATA_ROUTES.juz(id), {
        signal: signal ?? null,
        cache: 'force-cache',
      });

      if (!response.ok) {
        return { ok: false, error: `تعذّر تحميل الجزء (${response.status})` };
      }

      const payload: unknown = await response.json();
      if (!isJuzPayload(payload)) {
        return { ok: false, error: 'بيانات الجزء غير صالحة' };
      }

      return { ok: true, data: payload.verses };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { ok: false, error: 'تم إلغاء الطلب' };
      }
      return { ok: false, error: 'تعذّر الاتصال. تحقّق من الإنترنت ثم أعد المحاولة.' };
    }
  })();

  juzCache.set(id, request);

  const result = await request;
  if (!result.ok) juzCache.delete(id);

  return result;
}

/** Builds the human-readable span of a reading range, e.g. "من البقرة ١ إلى…". */
function describeRange(start: VerseRef, end: VerseRef, versesCount: number): string {
  const startChapter = getChapter(start.surah);
  const endChapter = getChapter(end.surah);
  if (!startChapter || !endChapter) return `${versesCount} آية`;
  return `من ${startChapter.name} ${start.ayah} إلى ${endChapter.name} ${end.ayah}`;
}

/** Loads a juz as a reading range. */
export async function fetchJuzRange(id: number, signal?: AbortSignal): Promise<Result<VerseRange>> {
  const juz = getJuz(id);
  if (!juz) return { ok: false, error: 'رقم الجزء غير صحيح' };

  const verses = await fetchJuzVerses(id, signal);
  if (!verses.ok) return verses;

  return {
    ok: true,
    data: {
      mode: 'juz',
      id: juz.id,
      title: juz.name,
      subtitle: describeRange(juz.start, juz.end, juz.versesCount),
      verses: verses.data,
      firstVerseId: juz.firstVerseId,
      lastVerseId: juz.lastVerseId,
    },
  };
}

/**
 * Loads a hizb as a reading range.
 *
 * Served from the containing juz payload rather than a file of its own: every
 * hizb sits inside exactly one juz, so this is a single request and costs no
 * additional bytes in the repository.
 */
export async function fetchHizbRange(
  id: number,
  signal?: AbortSignal,
): Promise<Result<VerseRange>> {
  const hizb = getHizb(id);
  if (!hizb) return { ok: false, error: 'رقم الحزب غير صحيح' };

  const juzVerses = await fetchJuzVerses(hizb.juz, signal);
  if (!juzVerses.ok) return juzVerses;

  const verses = juzVerses.data.filter(
    (verse) => verse.id >= hizb.firstVerseId && verse.id <= hizb.lastVerseId,
  );

  if (verses.length === 0) {
    return { ok: false, error: 'لا توجد آيات في هذا النطاق' };
  }

  return {
    ok: true,
    data: {
      mode: 'hizb',
      id: hizb.id,
      title: hizb.name,
      subtitle: describeRange(hizb.start, hizb.end, hizb.versesCount),
      verses,
      firstVerseId: hizb.firstVerseId,
      lastVerseId: hizb.lastVerseId,
    },
  };
}

/**
 * Loads one Mus'haf page as a reading range.
 *
 * Served from the juz payloads for the same reason a hizb is: the page index
 * holds only boundaries, so nothing here duplicates the Mus'haf on disk. Four
 * of the 604 pages straddle a juz boundary and need both payloads; the rest are
 * a single request, and both are already memoised.
 */
export async function fetchPageRange(
  id: number,
  signal?: AbortSignal,
): Promise<Result<VerseRange>> {
  const page = getPage(id);
  if (!page) return { ok: false, error: 'رقم الصفحة غير صحيح' };

  const payloads = await Promise.all(page.juz.map((juz) => fetchJuzVerses(juz, signal)));

  const failure = payloads.find((payload) => !payload.ok);
  if (failure && !failure.ok) return failure;

  const seen = new Set<number>();
  const verses: Verse[] = [];

  for (const payload of payloads) {
    if (!payload.ok) continue;
    for (const verse of payload.data) {
      if (verse.id < page.firstVerseId || verse.id > page.lastVerseId) continue;
      // A verse on a juz boundary appears in both payloads.
      if (seen.has(verse.id)) continue;
      seen.add(verse.id);
      verses.push(verse);
    }
  }

  if (verses.length === 0) {
    return { ok: false, error: 'لا توجد آيات في هذه الصفحة' };
  }

  verses.sort((a, b) => a.id - b.id);

  return {
    ok: true,
    data: {
      mode: 'page',
      id: page.id,
      title: `صفحة ${page.id}`,
      subtitle: describeRange(page.start, page.end, page.versesCount),
      verses,
      firstVerseId: page.firstVerseId,
      lastVerseId: page.lastVerseId,
    },
  };
}

/**
 * Picks the "ayah of the day" — deterministic for a given date, so every
 * visitor sees the same verse and it stays stable across a reload.
 */
export function getDailyVerseId(date: Date = new Date()): number {
  const dayNumber = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000,
  );
  // A prime multiplier spreads consecutive days across the whole Mus'haf
  // instead of walking through it verse by verse.
  return ((dayNumber * 2_654_435_761) % 6236) + 1;
}

/** Searches surah names and numbers locally — always available, even offline. */
export function searchChapters(
  query: string,
  normalise: (text: string) => string,
): readonly Chapter[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 114) {
    const chapter = getChapter(asNumber);
    return chapter ? [chapter] : [];
  }

  const needle = normalise(trimmed).toLowerCase();
  if (!needle) return [];

  return CHAPTERS.filter((chapter) => {
    const arabic = normalise(chapter.nameSimple).toLowerCase();
    const latin = chapter.transliteration.toLowerCase();
    const english = chapter.translation.toLowerCase();
    return arabic.includes(needle) || latin.includes(needle) || english.includes(needle);
  });
}
