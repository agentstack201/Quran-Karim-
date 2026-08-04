'use client';

import { memo, useCallback } from 'react';
import { ROUTES, SITE_URL } from '@/constants';
import { Icon, IconButton, useToast } from '@/components/ui';
import { useAudio } from '@/features/audio/AudioProvider';
import { useBookmarks } from '@/features/bookmarks/BookmarksProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import type { Verse } from '@/types';
import { canShare, cn, copyToClipboard, formatAyahForSharing, shareContent } from '@/utils';

export type VerseCardProps = {
  readonly verse: Verse;
  readonly surahName: string;
  /** Ayah numbers forming the playback queue this verse belongs to. */
  readonly queue: readonly number[];
  readonly onOpenTafsir: (verse: Verse) => void;
  /** Highlighted because it is being recited. */
  readonly playing: boolean;
  /** Highlighted because it was the navigation target. */
  readonly focused: boolean;
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
  playing,
  focused,
}: VerseCardProps): React.JSX.Element {
  const { settings } = useSettings();
  const { isBookmarked, toggleBookmark, recordLastRead } = useBookmarks();
  const { play, toggle, track } = useAudio();
  const { toast } = useToast();

  const bookmarked = isBookmarked(verse.key);
  const isCurrentTrack = track?.surah === verse.surah && track.ayah === verse.ayah;

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

  const onShare = useCallback(async () => {
    const url = `${SITE_URL}${ROUTES.surahAyah(verse.surah, verse.ayah)}`;
    const text = formatAyahForSharing({
      text: verse.text,
      surahName,
      surah: verse.surah,
      ayah: verse.ayah,
    });

    if (canShare()) {
      const outcome = await shareContent({
        title: `${surahName} — الآية ${verse.ayah}`,
        text,
        url,
      });
      if (outcome === 'failed') toast('تعذّرت المشاركة', { tone: 'error' });
      return;
    }

    // No share sheet on this platform — copying the same payload is the
    // closest useful equivalent.
    const copied = await copyToClipboard(`${text}\n${url}`);
    toast(copied ? 'تم نسخ الآية ورابطها' : 'تعذّرت المشاركة', {
      tone: copied ? 'success' : 'error',
    });
  }, [verse.text, verse.surah, verse.ayah, surahName, toast]);

  return (
    <article
      id={`ayah-${verse.ayah}`}
      aria-labelledby={`ayah-${verse.ayah}-label`}
      className={cn(
        'verse-block group scroll-mt-24 border-b border-border px-1 py-6 transition-colors duration-500 last:border-b-0 sm:px-3',
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
      >
        {verse.text}
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
        <IconButton icon="share" label="مشاركة الآية" onClick={onShare} size="sm" />

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
    previous.playing === next.playing &&
    previous.focused === next.focused &&
    previous.surahName === next.surahName &&
    previous.queue === next.queue &&
    previous.onOpenTafsir === next.onOpenTafsir
  );
});
