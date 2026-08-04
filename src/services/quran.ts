import chaptersData from '@/data/chapters.json';
import hizbData from '@/data/hizb.json';
import juzData from '@/data/juz.json';
import { API_ROUTES } from '@/constants';
import type { Chapter, ChapterWithVerses, Hizb, Juz, Result, Verse, VerseRange } from '@/types';

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
 */

export const CHAPTERS = chaptersData as readonly Chapter[];
export const JUZ_LIST = juzData as readonly Juz[];
export const HIZB_LIST = hizbData as readonly Hizb[];

/** Lookup by surah number, built once at module load. */
const CHAPTER_BY_ID = new Map<number, Chapter>(CHAPTERS.map((chapter) => [chapter.id, chapter]));

/** In-flight and completed surah requests, so a surah is fetched at most once. */
const surahCache = new Map<number, Promise<Result<ChapterWithVerses>>>();

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
      const response = await fetch(API_ROUTES.surah(id), {
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

/**
 * Loads every surah a verse range spans and returns the slice of verses that
 * falls inside it — how juz and hizb reading is assembled.
 */
export async function fetchVerseRange(
  firstVerseId: number,
  lastVerseId: number,
  signal?: AbortSignal,
): Promise<Result<readonly Verse[]>> {
  const firstChapter = getChapterByVerseId(firstVerseId);
  const lastChapter = getChapterByVerseId(lastVerseId);

  if (!firstChapter || !lastChapter) {
    return { ok: false, error: 'نطاق الآيات غير صحيح' };
  }

  const chapterIds: number[] = [];
  for (let id = firstChapter.id; id <= lastChapter.id; id += 1) chapterIds.push(id);

  const results = await Promise.all(chapterIds.map((id) => fetchChapter(id, signal)));

  const verses: Verse[] = [];
  for (const result of results) {
    if (!result.ok) return { ok: false, error: result.error };
    for (const verse of result.data.verses) {
      if (verse.id >= firstVerseId && verse.id <= lastVerseId) verses.push(verse);
    }
  }

  if (verses.length === 0) {
    return { ok: false, error: 'لا توجد آيات في هذا النطاق' };
  }

  return { ok: true, data: verses };
}

/** Loads a juz as a reading range. */
export async function fetchJuzRange(id: number, signal?: AbortSignal): Promise<Result<VerseRange>> {
  const juz = getJuz(id);
  if (!juz) return { ok: false, error: 'رقم الجزء غير صحيح' };

  const verses = await fetchVerseRange(juz.firstVerseId, juz.lastVerseId, signal);
  if (!verses.ok) return verses;

  const start = getChapter(juz.start.surah);
  const end = getChapter(juz.end.surah);

  return {
    ok: true,
    data: {
      mode: 'juz',
      id: juz.id,
      title: juz.name,
      subtitle:
        start && end
          ? `من ${start.name} ${juz.start.ayah} إلى ${end.name} ${juz.end.ayah}`
          : `${verses.data.length} آية`,
      verses: verses.data,
      firstVerseId: juz.firstVerseId,
      lastVerseId: juz.lastVerseId,
    },
  };
}

/** Loads a hizb as a reading range. */
export async function fetchHizbRange(
  id: number,
  signal?: AbortSignal,
): Promise<Result<VerseRange>> {
  const hizb = getHizb(id);
  if (!hizb) return { ok: false, error: 'رقم الحزب غير صحيح' };

  const verses = await fetchVerseRange(hizb.firstVerseId, hizb.lastVerseId, signal);
  if (!verses.ok) return verses;

  const start = getChapter(hizb.start.surah);
  const end = getChapter(hizb.end.surah);

  return {
    ok: true,
    data: {
      mode: 'hizb',
      id: hizb.id,
      title: hizb.name,
      subtitle:
        start && end
          ? `من ${start.name} ${hizb.start.ayah} إلى ${end.name} ${hizb.end.ayah}`
          : `${verses.data.length} آية`,
      verses: verses.data,
      firstVerseId: hizb.firstVerseId,
      lastVerseId: hizb.lastVerseId,
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
