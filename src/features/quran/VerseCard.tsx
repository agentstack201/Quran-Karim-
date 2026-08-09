'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Icon, IconButton, useToast } from '@/components/ui';
import { useAudio } from '@/features/audio/AudioProvider';
import { useBookmarks } from '@/features/bookmarks/BookmarksProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import type { MemorizationMask, Verse } from '@/types';
import { cn, copyToClipboard, formatAyahForSharing } from '@/utils';

export type VerseCardProps = {
  readonly verse: Verse;
  readonly surahName: string;
  /** Ayah numbers forming the playback queue this verse belongs to. */
  readonly queue: readonly number[];
  readonly onOpenTafsir: (verse: Verse) => void;
  /**
   * Opens the share sheet.
   *
   * Raised to the reader rather than handled here: one dialog for the range
   * instead of one per verse, which in Al-Baqarah is the difference between a
   * single mounted sheet and 286 of them.
   */
  readonly onShare: (verse: Verse) => void;
  /** Highlighted because it is being recited. */
  readonly playing: boolean;
  /** Highlighted because it was the navigation target. */
  readonly focused: boolean;
  /**
   * Allow the browser to skip rendering this verse while it is off-screen.
   *
   * Only set for verses far enough down that they cannot be in the first
   * viewport. `content-visibility` reserves an estimated height and corrects it
   * on first render, and when that correction lands inside the viewport it
   * counts as a layout shift — which measured 0.19 across the reading pages.
   * Below the fold the same correction is invisible and free.
   */
  readonly deferred: boolean;
};

/**
 * One ayah, with its actions.
 *
 * Memoised: a long surah renders hundreds of these, and without memoisation
 * every playback tick would re-render all of them. The comparator checks only
 * the props that can actually change per verse during a recitation.
 *
 * The action row is always in the DOM — revealing controls on hover would put
 * them out of reach of keyboard and touch users — but fades to a low opacity at
 * rest so the page stays calm, and returns to full opacity on hover or when
 * anything inside it takes focus.
 */
function VerseCardComponent({
  verse,
  surahName,
  queue,
  onOpenTafsir,
  onShare,
  playing,
  focused,
  deferred,
}: VerseCardProps): React.JSX.Element {
  const { settings } = useSettings();
  const { isBookmarked, toggleBookmark, recordLastRead } = useBookmarks();
  const { play, toggle, track } = useAudio();
  const { toast } = useToast();

  const bookmarked = isBookmarked(verse.key);
  const isCurrentTrack = track?.surah === verse.surah && track.ayah === verse.ayah;

  /**
   * Memorisation masking.
   *
   * Revealing is per-verse and deliberately not persisted: the point of the
   * exercise is that the text is hidden again next time you meet it.
   */
  const [revealedFor, setRevealedFor] = useState<MemorizationMask | null>(null);
  const revealed = revealedFor === settings.memorizationMask;
  const masked = settings.memorizationMask !== 'none' && !revealed;

  // Splitting on spaces is safe for Arabic: shaping joins letters within a word
  // and never across a space, so each word renders exactly as it does inline.
  const words = useMemo(
    () => (settings.memorizationMask === 'none' ? [] : verse.text.split(' ')),
    [verse.text, settings.memorizationMask],
  );

  // Recording *which* level was revealed, rather than a plain flag, means
  // changing the level conceals the verse again — moving from "first word" to
  // "hidden" is a harder round of the same exercise, not a continuation of the
  // one already solved.
  const toggleReveal = useCallback(() => {
    setRevealedFor((current) =>
      current === settings.memorizationMask ? null : settings.memorizationMask,
    );
  }, [settings.memorizationMask]);

  const onPlay = useCallback(() => {
    if (isCurrentTrack) {
      toggle();
      return;
    }
    play({ surah: verse.surah, ayah: verse.ayah, queue });
    recordLastRead({ surah: verse.surah, ayah: verse.ayah, surahName });
  }, [isCurrentTrack, toggle, play, verse.surah, verse.ayah, queue, recordLastRead, surahName]);

  const onBookmark = useCallback(() => {
    const saved = toggleBookmark({
      surah: verse.surah,
      ayah: verse.ayah,
      surahName,
      text: verse.text,
    });
    toast(saved ? 'تم حفظ الآية' : 'تمت إزالة الآية من المحفوظات', {
      tone: saved ? 'success' : 'neutral',
    });
  }, [toggleBookmark, verse.surah, verse.ayah, verse.text, surahName, toast]);

  const onCopy = useCallback(async () => {
    const copied = await copyToClipboard(
      formatAyahForSharing({
        text: verse.text,
        surahName,
        surah: verse.surah,
        ayah: verse.ayah,
      }),
    );
    toast(copied ? 'تم نسخ الآية' : 'تعذّر النسخ إلى الحافظة', {
      tone: copied ? 'success' : 'error',
    });
  }, [verse.text, verse.surah, verse.ayah, surahName, toast]);

  return (
    <article
      id={`ayah-${verse.ayah}`}
      aria-labelledby={`ayah-${verse.ayah}-label`}
      className={cn(
        'group scroll-mt-24 border-b border-border px-1 py-6 transition-colors duration-500 last:border-b-0 sm:px-3',
        deferred && 'verse-block',
        playing && 'bg-[var(--verse-playing)]',
        !playing && focused && 'bg-[var(--verse-highlight)]',
      )}
    >
      <h2 id={`ayah-${verse.ayah}-label`} className="sr-only">
        {surahName} — الآية {verse.ayah}
      </h2>

      <p
        className="quran-text quran-text--flow text-ink"
        // The Uthmani text is authored right-to-left; stating it explicitly
        // keeps the ayah medallion correctly placed even if an ancestor's
        // direction is ever overridden.
        dir="rtl"
        lang="ar"
        // Touch reveal, duplicated by a real button in the action row below so
        // the same thing is reachable from a keyboard and a screen reader.
        onClick={masked ? toggleReveal : undefined}
      >
        {masked ? (
          words.map((word, position) => (
            <span
              key={position}
              // The first word stays legible at the `firstWord` level: it is the
              // cue a memoriser recalls the rest of the ayah from, and hiding it
              // turns practice into a blank stare.
              className={
                settings.memorizationMask === 'firstWord' && position === 0
                  ? undefined
                  : 'verse-masked'
              }
            >
              {word}
              {position < words.length - 1 ? ' ' : ''}
            </span>
          ))
        ) : (
          <>{verse.text}</>
        )}
        <span className="ayah-medallion" aria-hidden="true">
          {verse.numberInSurah}
        </span>
      </p>

      {settings.showTransliteration && (
        <p className="mt-3 text-sm leading-relaxed text-ink-subtle italic" dir="ltr" lang="en">
          {verse.transliteration}
        </p>
      )}

      {settings.showTranslation && (
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted" dir="ltr" lang="en">
          {verse.translation}
        </p>
      )}

      {/*
        Always at full opacity. Fading the whole row at rest looked calmer, but
        it dropped the ayah reference to a 1.6:1 contrast ratio — an
        accessibility failure that no amount of restraint justifies. The row
        recedes through colour instead, and the icon buttons gain contrast on
        hover and focus.
      */}
      <div className="mt-3 flex items-center gap-0.5">
        <span className="me-1.5 rounded-xs bg-surface-sunken px-2 py-1 text-[0.6875rem] font-semibold text-ink-subtle tabular-nums">
          {verse.surah}:{verse.ayah}
        </span>

        <IconButton
          icon={isCurrentTrack && playing ? 'pause' : 'play'}
          label={isCurrentTrack && playing ? 'إيقاف تلاوة الآية' : 'تلاوة الآية'}
          onClick={onPlay}
          size="sm"
          active={isCurrentTrack}
        />
        <IconButton
          icon="bookmark"
          label={bookmarked ? 'إزالة الآية من المحفوظات' : 'حفظ الآية'}
          onClick={onBookmark}
          size="sm"
          active={bookmarked}
          className={cn(bookmarked && 'text-accent')}
        />
        <IconButton
          icon="book"
          label="عرض التفسير والترجمة"
          onClick={() => onOpenTafsir(verse)}
          size="sm"
        />
        <IconButton icon="copy" label="نسخ الآية" onClick={onCopy} size="sm" />
        <IconButton icon="share" label="مشاركة الآية" onClick={() => onShare(verse)} size="sm" />

        {settings.memorizationMask !== 'none' && (
          <IconButton
            icon={revealed ? 'eyeOff' : 'eye'}
            label={revealed ? 'إخفاء الآية' : 'كشف الآية'}
            onClick={toggleReveal}
            size="sm"
            active={revealed}
          />
        )}

        {verse.sajdah && (
          <span className="ms-auto flex items-center gap-1 rounded-xs bg-accent-soft px-2 py-1 text-[0.6875rem] font-semibold text-accent">
            <Icon name="star" size={12} />
            سجدة
          </span>
        )}
      </div>
    </article>
  );
}

export const VerseCard = memo(VerseCardComponent, (previous, next) => {
  return (
    previous.verse.id === next.verse.id &&
    previous.deferred === next.deferred &&
    previous.playing === next.playing &&
    previous.focused === next.focused &&
    previous.surahName === next.surahName &&
    previous.queue === next.queue &&
    previous.onOpenTafsir === next.onOpenTafsir &&
    previous.onShare === next.onShare
  );
});
