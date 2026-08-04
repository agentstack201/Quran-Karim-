'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ROUTES, SEARCH_DEBOUNCE_MS, SEARCH_MIN_LENGTH } from '@/constants';
import { CHAPTERS, searchChapters } from '@/services/quran';
import type { AsyncStatus, Chapter, SearchResponse, SearchResult } from '@/types';
import { normaliseArabic, parseVerseReference } from '@/utils';
import { useDebouncedValue } from './useDebouncedValue';
import { useOnlineStatus } from './useOnlineStatus';

export type SearchState = {
  readonly query: string;
  readonly setQuery: (query: string) => void;
  readonly status: AsyncStatus;
  /** Full-text hits from the server. Empty while offline. */
  readonly verses: readonly SearchResult[];
  /** Surah-name matches, resolved locally and always available. */
  readonly chapters: readonly Chapter[];
  /** Set when the query is a `surah:ayah` reference, e.g. "2:255". */
  readonly reference: { surah: number; ayah: number; chapter: Chapter } | null;
  readonly total: number;
  readonly truncated: boolean;
  readonly error: string | null;
  /** True when full-text search is unavailable because the device is offline. */
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
 * Surah-name matching and `surah:ayah` reference parsing run locally and
 * resolve instantly — they work offline and cost nothing. Full-text search hits
 * `/api/search`, because the index that powers it belongs on the server.
 *
 * When the device is offline the local lookups still answer, and `degraded`
 * lets the UI say so plainly instead of showing an empty result list.
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

  useEffect(() => {
    if (!shouldSearch || !online) return;

    const controller = new AbortController();

    const run = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_ROUTES.search}?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Search failed: ${response.status}`);

        const payload = (await response.json()) as SearchResponse;

        setSnapshot({
          query: trimmed,
          verses: payload.results,
          total: payload.total,
          truncated: payload.truncated,
          error: null,
        });
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setSnapshot({
          query: trimmed,
          verses: NO_VERSES,
          total: 0,
          truncated: false,
          error: 'تعذّر تنفيذ البحث. حاول مرة أخرى.',
        });
      }
    };

    void run();

    return () => controller.abort();
  }, [trimmed, shouldSearch, online]);

  const clear = useCallback(() => {
    setQuery('');
    setSnapshot(null);
  }, []);

  const resolved = snapshot?.query === trimmed ? snapshot : null;

  let status: AsyncStatus;
  if (!shouldSearch) status = 'idle';
  else if (!online) status = 'success';
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
    degraded: !online && shouldSearch,
    clear,
  };
}
