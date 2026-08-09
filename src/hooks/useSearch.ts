'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_LENGTH } from '@/constants';
import { CHAPTERS, searchChapters } from '@/services/quran';
import { isSearchIndexResident, searchVerses } from '@/services/search';
import type { AsyncStatus, Chapter, SearchResult } from '@/types';
import { normaliseArabic, parseVerseReference } from '@/utils';
import { useDebouncedValue } from './useDebouncedValue';
import { useOnlineStatus } from './useOnlineStatus';

export type SearchState = {
  readonly query: string;
  readonly setQuery: (query: string) => void;
  readonly status: AsyncStatus;
  /** Full-text hits, resolved in the browser against the local index. */
  readonly verses: readonly SearchResult[];
  /** Surah-name matches, resolved locally and always available. */
  readonly chapters: readonly Chapter[];
  /** Set when the query is a `surah:ayah` reference, e.g. "2:255". */
  readonly reference: { surah: number; ayah: number; chapter: Chapter } | null;
  readonly total: number;
  readonly truncated: boolean;
  readonly error: string | null;
  /**
   * True only when full-text search genuinely cannot run: the device is offline
   * *and* the index was never downloaded. Once it is cached, being offline
   * changes nothing, so claiming degradation then would be a lie.
   */
  readonly degraded: boolean;
  readonly clear: () => void;
};

/** A completed request, tagged with the query it answered. */
type Snapshot = {
  readonly query: string;
  readonly verses: readonly SearchResult[];
  readonly total: number;
  readonly truncated: boolean;
  readonly error: string | null;
};

const NO_VERSES: readonly SearchResult[] = [];

/**
 * Search-as-you-type across three lookups that answer different questions.
 *
 * All three run in the browser. Surah-name matching and `surah:ayah` reference
 * parsing resolve from bundled metadata; full-text search resolves against an
 * index fetched once and cached immutably, so after a reader's first search the
 * whole feature is local, instant and available offline.
 *
 * `degraded` covers the one case that remains: a first search attempted with no
 * connection and no cached index. The UI says so plainly instead of showing an
 * empty result list.
 *
 * Verse results are derived from a query-tagged snapshot rather than reset
 * through effects, so a stale response can never be attributed to a newer
 * query.
 */
export function useSearch(initialQuery = ''): SearchState {
  const [query, setQuery] = useState(initialQuery);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const online = useOnlineStatus();
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const trimmed = debouncedQuery.trim();
  const shouldSearch = trimmed.length >= SEARCH_MIN_LENGTH;

  /** A `2:255`-style reference resolves directly to that ayah. */
  const reference = useMemo(() => {
    const parsed = parseVerseReference(trimmed);
    if (!parsed) return null;
    const chapter = CHAPTERS.find((item) => item.id === parsed.surah);
    if (!chapter || parsed.ayah > chapter.versesCount) return null;
    return { ...parsed, chapter };
  }, [trimmed]);

  const chapters = useMemo(
    () => (trimmed.length >= 1 ? searchChapters(trimmed, normaliseArabic).slice(0, 8) : []),
    [trimmed],
  );

  const unreachable = !online && !isSearchIndexResident();

  useEffect(() => {
    if (!shouldSearch || unreachable) return;

    const controller = new AbortController();

    const run = async (): Promise<void> => {
      const result = await searchVerses(trimmed, undefined, controller.signal);
      if (controller.signal.aborted) return;

      setSnapshot(
        result.ok
          ? {
              query: trimmed,
              verses: result.data.results,
              total: result.data.total,
              truncated: result.data.truncated,
              error: null,
            }
          : { query: trimmed, verses: NO_VERSES, total: 0, truncated: false, error: result.error },
      );
    };

    void run();

    return () => controller.abort();
  }, [trimmed, shouldSearch, unreachable]);

  const clear = useCallback(() => {
    setQuery('');
    setSnapshot(null);
  }, []);

  const resolved = snapshot?.query === trimmed ? snapshot : null;

  let status: AsyncStatus;
  if (!shouldSearch) status = 'idle';
  else if (unreachable) status = 'success';
  else if (!resolved) status = 'loading';
  else status = resolved.error ? 'error' : 'success';

  return {
    query,
    setQuery,
    status,
    verses: resolved?.verses ?? NO_VERSES,
    chapters,
    reference,
    total: resolved?.total ?? 0,
    truncated: resolved?.truncated ?? false,
    error: resolved?.error ?? null,
    degraded: unreachable && shouldSearch,
    clear,
  };
}
