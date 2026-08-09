'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BASMALAH } from '@/constants';
import { ErrorState, SkeletonReader } from '@/components/ui';
import { useAudio } from '@/features/audio/AudioProvider';
import { useBookmarks } from '@/features/bookmarks/BookmarksProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useKeyboardShortcuts, scrollIntoView } from '@/hooks';
import { fetchChapter, fetchHizbRange, fetchJuzRange, fetchPageRange } from '@/services/quran';
import type { AsyncStatus, ReadingMode, Verse } from '@/types';
import { TafsirDialog } from './TafsirDialog';
import { VerseCard } from './VerseCard';

export type ReaderProps = {
  readonly mode: ReadingMode;
  readonly id: number;
  /** Show the Basmalah above the first verse. */
  readonly showBasmalah?: boolean;
  readonly surahName: string;
  /**
   * The opening verses, inlined by the server into the static HTML.
   *
   * They render on the very first paint, so the reader never shows a skeleton
   * where text is about to appear — which is what removed the 0.19 layout shift
   * these pages used to score. The client fetch still runs and still fills the
   * offline cache; it just replaces this opening with the complete range.
   */
  readonly initialVerses?: readonly Verse[];
  /** Total verses in the range, used to reserve scroll height while loading. */
  readonly totalVerses?: number;
};

/** Stable empty array so downstream memos do not see a new reference each render. */
const NO_VERSES: readonly Verse[] = [];

/**
 * Index from which verses opt into off-screen render skipping.
 *
 * Set beyond the tallest possible first viewport, so the height correction
 * `content-visibility` performs on first render never happens where the user
 * can see it — which is the difference between 0 and 0.19 cumulative layout
 * shift on these pages.
 */
const DEFERRED_RENDER_FROM = 15;

/** A completed load, tagged with what it loaded. */
type Snapshot = {
  readonly requestKey: string;
  readonly verses: readonly Verse[];
  readonly error: string | null;
};

/**
 * The reading surface.
 *
 * Loads on the client rather than the server, deliberately: verse payloads are
 * immutable static assets, so fetching them from the browser lets the service
 * worker cache them permanently and makes every repeat visit — and every
 * offline visit — instant. Server-rendering them instead would put 250 kB of
 * Al-Baqarah into the HTML on every single request.
 *
 * The page shell, headers, navigation and metadata *are* server-rendered around
 * this component, so search engines and the first paint never wait on it. This
 * component is mounted inside a Suspense boundary because it reads the deep-link
 * query parameter, which opts its subtree — and only its subtree — out of
 * static prerendering.
 */
export function Reader({
  mode,
  id,
  showBasmalah = false,
  surahName,
  initialVerses = NO_VERSES,
  totalVerses = 0,
}: ReaderProps): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [tafsirVerse, setTafsirVerse] = useState<Verse | null>(null);

  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const { track, playing, toggle, next, previous, play } = useAudio();
  const { recordLastRead, toggleBookmark } = useBookmarks();

  const containerRef = useRef<HTMLDivElement>(null);
  const requestKey = `${mode}:${id}:${reloadToken}`;

  useEffect(() => {
    const controller = new AbortController();

    const run = async (): Promise<void> => {
      const result =
        mode === 'surah'
          ? await fetchChapter(id, controller.signal)
          : mode === 'juz'
            ? await fetchJuzRange(id, controller.signal)
            : mode === 'page'
              ? await fetchPageRange(id, controller.signal)
              : await fetchHizbRange(id, controller.signal);

      if (controller.signal.aborted) return;

      if (!result.ok) {
        setSnapshot({ requestKey, verses: [], error: result.error });
        return;
      }

      const verses = 'verses' in result.data ? result.data.verses : [];
      setSnapshot({ requestKey, verses, error: null });
    };

    void run();

    return () => controller.abort();
  }, [requestKey, mode, id]);

  const resolved = snapshot?.requestKey === requestKey ? snapshot : null;
  // Until the fetch lands, render the server-inlined opening. Because those are
  // the same verses the fetch will return first, the swap is invisible.
  const verses = resolved?.verses ?? initialVerses;

  let status: AsyncStatus;
  if (resolved?.error) status = 'error';
  else if (!resolved && initialVerses.length === 0) status = 'loading';
  else status = 'success';

  /**
   * Height reserved for the verses still in flight.
   *
   * Without it the page is only as tall as the inlined opening, so the
   * scrollbar jumps the moment the rest arrives. 210px is the measured median
   * verse height at the default type size.
   */
  const pendingHeight =
    resolved || totalVerses <= verses.length ? undefined : (totalVerses - verses.length) * 210;

  /**
   * The playback queue. In surah mode it is the surah's own ayah numbers; for
   * a juz or hizb the range can span several surahs, so the queue is scoped to
   * whichever surah the playing ayah belongs to — a recitation must never jump
   * across a surah boundary mid-queue.
   */
  const queuesBySurah = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const verse of verses) {
      const existing = map.get(verse.surah);
      if (existing) existing.push(verse.ayah);
      else map.set(verse.surah, [verse.ayah]);
    }
    return map;
  }, [verses]);

  /**
   * Records where the reader actually is, not where the range begins.
   *
   * This used to store `verses[0]` on mount, which meant "continue reading"
   * always returned to the top of the surah — you could stop at Al-Kahf 70 and
   * be sent back to verse 1 the next day, with a progress bar that agreed.
   *
   * The observed band sits in the upper third of the viewport rather than
   * spanning it: that is where the eye rests while reading, and a full-height
   * root would resolve to whichever verse merely happens to be tallest.
   * Verses are identified by their index in the range, because ayah numbers
   * restart at every surah boundary and a juz spans several.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || verses.length === 0) return;

    const nodes = container.querySelectorAll<HTMLElement>('[data-verse-index]');
    if (nodes.length === 0) return;

    const visible = new Set<number>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(entry.target.getAttribute('data-verse-index'));
          if (!Number.isInteger(index)) continue;
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        }

        // Scrolling past the band momentarily empties the set; keeping the last
        // known position is more useful than recording nothing.
        if (visible.size === 0) return;

        const topmost = verses[Math.min(...visible)];
        if (!topmost) return;

        // Coalesced, because a fast scroll crosses many thresholds and each
        // write reaches LocalStorage.
        clearTimeout(timer);
        timer = setTimeout(() => {
          recordLastRead({ surah: topmost.surah, ayah: topmost.ayah, surahName });
        }, 400);
      },
      { rootMargin: '-12% 0px -62% 0px' },
    );

    for (const node of nodes) observer.observe(node);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [verses, recordLastRead, surahName]);

  /**
   * The deep-linked ayah, read straight from the query string.
   *
   * Derived rather than stored: `ROUTES.surahAyah` puts the ayah in the query
   * as well as the fragment precisely so the highlight is available during
   * render, with no effect and no flash of an unhighlighted verse.
   */
  const focusedAyah = (() => {
    const requested = Number(searchParams.get('ayah'));
    return Number.isInteger(requested) && requested > 0 ? requested : null;
  })();

  /** Brings the deep-linked ayah into view once the verses have painted. */
  useEffect(() => {
    if (focusedAyah === null || verses.length === 0) return;

    const element = document.getElementById(`ayah-${focusedAyah}`);
    if (!element) return;

    // One frame of delay lets layout settle after the verse list paints.
    const frame = requestAnimationFrame(() => scrollIntoView(element, 'center'));
    return () => cancelAnimationFrame(frame);
  }, [focusedAyah, verses.length]);

  /** Keeps the ayah being recited in view. */
  useEffect(() => {
    if (!settings.autoScroll || !track || !playing) return;

    const element = document.getElementById(`ayah-${track.ayah}`);
    if (!element) return;

    const frame = requestAnimationFrame(() => scrollIntoView(element, 'center'));
    return () => cancelAnimationFrame(frame);
  }, [track, playing, settings.autoScroll]);

  const onOpenTafsir = useCallback((verse: Verse) => setTafsirVerse(verse), []);

  /** Play/pause and bookmark act on the ayah being recited, else the first. */
  const activeVerse = useMemo(() => {
    if (track) {
      const match = verses.find(
        (verse) => verse.surah === track.surah && verse.ayah === track.ayah,
      );
      if (match) return match;
    }
    return verses[0] ?? null;
  }, [track, verses]);

  useKeyboardShortcuts(
    {
      playPause: () => {
        if (track) {
          toggle();
          return;
        }
        if (!activeVerse) return;
        play({
          surah: activeVerse.surah,
          ayah: activeVerse.ayah,
          queue: queuesBySurah.get(activeVerse.surah) ?? [activeVerse.ayah],
        });
      },
      nextAyah: next,
      previousAyah: previous,
      bookmark: () => {
        if (!activeVerse) return;
        toggleBookmark({
          surah: activeVerse.surah,
          ayah: activeVerse.ayah,
          surahName,
          text: activeVerse.text,
        });
      },
    },
    verses.length > 0,
  );

  return (
    <>
      <div ref={containerRef} className="mx-auto max-w-3xl px-4 sm:px-6">
        {showBasmalah && status === 'success' && (
          <p className="quran-text py-8 text-center text-primary" dir="rtl" lang="ar">
            {BASMALAH}
          </p>
        )}

        {status === 'loading' && <SkeletonReader count={6} />}

        {status === 'error' && (
          <ErrorState
            message={resolved?.error ?? undefined}
            onRetry={() => setReloadToken((token) => token + 1)}
          />
        )}

        {status === 'success' && (
          <div role="list" aria-label={`آيات ${surahName}`}>
            {verses.map((verse, index) => (
              <div role="listitem" key={verse.id} data-verse-index={index}>
                <VerseCard
                  verse={verse}
                  surahName={surahName}
                  queue={queuesBySurah.get(verse.surah) ?? [verse.ayah]}
                  onOpenTafsir={onOpenTafsir}
                  playing={track?.surah === verse.surah && track.ayah === verse.ayah && playing}
                  focused={focusedAyah === verse.ayah}
                  deferred={index >= DEFERRED_RENDER_FROM}
                />
              </div>
            ))}
          </div>
        )}

        {pendingHeight !== undefined && (
          <div style={{ blockSize: pendingHeight }} aria-hidden="true">
            <SkeletonReader count={3} />
          </div>
        )}
      </div>

      <TafsirDialog verse={tafsirVerse} onClose={() => setTafsirVerse(null)} />
    </>
  );
}
