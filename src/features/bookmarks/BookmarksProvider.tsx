'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { MAX_BOOKMARKS, STORAGE_KEYS } from '@/constants';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Bookmark, LastRead, ReadingStats } from '@/types';
import { excerpt } from '@/utils';

type BookmarksContextValue = {
  readonly bookmarks: readonly Bookmark[];
  readonly lastRead: LastRead | null;
  readonly hydrated: boolean;
  readonly isBookmarked: (key: string) => boolean;
  /** Adds or removes a bookmark. Returns the state after the toggle. */
  readonly toggleBookmark: (input: {
    surah: number;
    ayah: number;
    surahName: string;
    text: string;
  }) => boolean;
  readonly removeBookmark: (key: string) => void;
  readonly clearBookmarks: () => void;
  readonly recordLastRead: (input: { surah: number; ayah: number; surahName: string }) => void;
  readonly stats: ReadingStats;
};

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

function parseBookmarks(raw: unknown): readonly Bookmark[] | null {
  if (!Array.isArray(raw)) return null;

  const valid: Bookmark[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.key !== 'string' ||
      typeof candidate.surah !== 'number' ||
      typeof candidate.ayah !== 'number'
    ) {
      continue;
    }
    valid.push({
      key: candidate.key,
      surah: candidate.surah,
      ayah: candidate.ayah,
      surahName: typeof candidate.surahName === 'string' ? candidate.surahName : '',
      excerpt: typeof candidate.excerpt === 'string' ? candidate.excerpt : '',
      createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
    });
  }
  return valid;
}

function parseLastRead(raw: unknown): LastRead | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.surah !== 'number' || typeof candidate.ayah !== 'number') return null;
  return {
    surah: candidate.surah,
    ayah: candidate.ayah,
    surahName: typeof candidate.surahName === 'string' ? candidate.surahName : '',
    timestamp: typeof candidate.timestamp === 'number' ? candidate.timestamp : Date.now(),
  };
}

function parseStringArray(raw: unknown): readonly string[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter((item): item is string => typeof item === 'string');
}

function parseNumberArray(raw: unknown): readonly number[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter((item): item is number => typeof item === 'number');
}

/** Local date key (`YYYY-MM-DD`) used to count reading-streak days. */
function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Counts consecutive days ending today (or yesterday, if today is unread). */
function computeStreak(days: readonly string[]): number {
  if (days.length === 0) return 0;

  const unique = [...new Set(days)].sort().reverse();
  const dayMs = 86_400_000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const first = unique[0];
  if (!first) return 0;

  const mostRecent = new Date(`${first}T00:00:00`).getTime();
  const gap = Math.round((startOfToday.getTime() - mostRecent) / dayMs);
  // A streak survives one missed day only while today is still in progress.
  if (gap > 1) return 0;

  let streak = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const current = unique[index];
    const previous = unique[index - 1];
    if (!current || !previous) break;
    const difference = Math.round(
      (new Date(`${previous}T00:00:00`).getTime() - new Date(`${current}T00:00:00`).getTime()) /
        dayMs,
    );
    if (difference !== 1) break;
    streak += 1;
  }

  return streak;
}

/**
 * Bookmarks, last-read position and reading statistics.
 *
 * All of it is local to the device: there is no account, no sync and no
 * telemetry. That is a product decision, not a limitation — a Mus'haf should
 * not require anyone to sign in, and reading habits are private.
 */
export function BookmarksProvider({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const {
    value: bookmarks,
    setValue: setBookmarks,
    hydrated: bookmarksHydrated,
  } = useLocalStorage<readonly Bookmark[]>(STORAGE_KEYS.bookmarks, [], parseBookmarks);

  const {
    value: lastRead,
    setValue: setLastRead,
    hydrated: lastReadHydrated,
  } = useLocalStorage<LastRead | null>(STORAGE_KEYS.lastRead, null, parseLastRead);

  const { value: visitedSurahs, setValue: setVisitedSurahs } = useLocalStorage<readonly number[]>(
    STORAGE_KEYS.visitedSurahs,
    [],
    parseNumberArray,
  );

  const { value: readingDays, setValue: setReadingDays } = useLocalStorage<readonly string[]>(
    STORAGE_KEYS.readingDays,
    [],
    parseStringArray,
  );

  const bookmarkKeys = useMemo(() => new Set(bookmarks.map((item) => item.key)), [bookmarks]);

  const isBookmarked = useCallback((key: string) => bookmarkKeys.has(key), [bookmarkKeys]);

  const toggleBookmark = useCallback(
    (input: { surah: number; ayah: number; surahName: string; text: string }): boolean => {
      const key = `${input.surah}:${input.ayah}`;
      const alreadySaved = bookmarkKeys.has(key);

      setBookmarks((current) => {
        if (alreadySaved) return current.filter((item) => item.key !== key);

        const entry: Bookmark = {
          key,
          surah: input.surah,
          ayah: input.ayah,
          surahName: input.surahName,
          excerpt: excerpt(input.text, 110),
          createdAt: Date.now(),
        };

        // Newest first, oldest evicted once the cap is reached.
        return [entry, ...current].slice(0, MAX_BOOKMARKS);
      });

      return !alreadySaved;
    },
    [bookmarkKeys, setBookmarks],
  );

  const removeBookmark = useCallback(
    (key: string) => setBookmarks((current) => current.filter((item) => item.key !== key)),
    [setBookmarks],
  );

  const clearBookmarks = useCallback(() => setBookmarks([]), [setBookmarks]);

  const recordLastRead = useCallback(
    (input: { surah: number; ayah: number; surahName: string }) => {
      setLastRead({ ...input, timestamp: Date.now() });
      setVisitedSurahs((current) =>
        current.includes(input.surah) ? current : [...current, input.surah],
      );
      setReadingDays((current) => {
        const today = todayKey();
        if (current.includes(today)) return current;
        // 400 days is well past any streak worth displaying.
        return [...current, today].slice(-400);
      });
    },
    [setLastRead, setVisitedSurahs, setReadingDays],
  );

  const stats = useMemo<ReadingStats>(
    () => ({
      bookmarkCount: bookmarks.length,
      versesRead: visitedSurahs.length,
      surahsVisited: visitedSurahs.length,
      streakDays: computeStreak(readingDays),
    }),
    [bookmarks.length, visitedSurahs.length, readingDays],
  );

  const value = useMemo<BookmarksContextValue>(
    () => ({
      bookmarks,
      lastRead,
      hydrated: bookmarksHydrated && lastReadHydrated,
      isBookmarked,
      toggleBookmark,
      removeBookmark,
      clearBookmarks,
      recordLastRead,
      stats,
    }),
    [
      bookmarks,
      lastRead,
      bookmarksHydrated,
      lastReadHydrated,
      isBookmarked,
      toggleBookmark,
      removeBookmark,
      clearBookmarks,
      recordLastRead,
      stats,
    ],
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

/** Access bookmarks and reading history. Must be used under the provider. */
export function useBookmarks(): BookmarksContextValue {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarksProvider');
  }
  return context;
}
