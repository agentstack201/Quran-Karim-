'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { Card, Icon, IconButton, Skeleton, useToast } from '@/components/ui';
import { useAudio } from '@/features/audio/AudioProvider';
import { fetchChapter, getChapterByVerseId, getDailyVerseId } from '@/services/quran';
import type { Verse } from '@/types';
import { copyToClipboard, formatAyahForSharing, toArabicNumerals } from '@/utils';

/**
 * «آية اليوم».
 *
 * يُشتق رقم الآية من تاريخ اليوم بدالة حتمية، فيرى كل الزوار الآية نفسها وتبقى
 * ثابتة عبر إعادة التحميل — دون أي حالة على الخادم.
 *
 * الاختيار يتم على العميل عمداً: لو حُسب أثناء التصيير على الخادم لاعتمد على
 * منطقة الخادم الزمنية، ولثبّتته الصفحة الساكنة على يومٍ واحد إلى الأبد.
 */
export function DailyVerse(): React.JSX.Element {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [failed, setFailed] = useState(false);
  const { play } = useAudio();
  const { toast } = useToast();

  useEffect(() => {
    const controller = new AbortController();

    const run = async (): Promise<void> => {
      const verseId = getDailyVerseId();
      const chapter = getChapterByVerseId(verseId);
      if (!chapter) {
        setFailed(true);
        return;
      }

      const result = await fetchChapter(chapter.id, controller.signal);
      if (controller.signal.aborted) return;

      if (!result.ok) {
        setFailed(true);
        return;
      }

      const found = result.data.verses.find((item) => item.id === verseId);
      if (found) setVerse(found);
      else setFailed(true);
    };

    /*
     * Deferred off the critical path.
     *
     * Picking the verse means loading the surah that contains it, and that
     * surah can be Al-Baqarah — 274 kB to parse for a single ayah, competing
     * with first paint for main-thread time on a phone. The card is not what a
     * visitor came for, so it waits until the browser is idle.
     *
     * `requestIdleCallback` is unavailable on Safari, hence the timeout.
     */
    const schedule =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(() => void run(), { timeout: 2500 })
        : window.setTimeout(() => void run(), 400);

    return () => {
      controller.abort();
      if (typeof window.cancelIdleCallback === 'function' && typeof schedule === 'number') {
        window.cancelIdleCallback(schedule);
      } else {
        window.clearTimeout(schedule as number);
      }
    };
  }, []);

  if (failed) {
    return (
      <Card className="p-6">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-subtle">
          <Icon name="sparkle" size={14} className="text-accent" />
          آية اليوم
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          تعذّر تحميل آية اليوم. يمكنك تصفّح المصحف كاملاً من قائمة السور.
        </p>
      </Card>
    );
  }

  if (!verse) {
    return (
      <Card className="p-6" aria-busy="true" aria-label="جارٍ تحميل آية اليوم">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-4 h-8 w-full" />
        <Skeleton className="mt-2.5 h-8 w-4/5" />
        <Skeleton className="mt-4 h-3 w-24" />
      </Card>
    );
  }

  const chapter = getChapterByVerseId(verse.id);
  const surahName = chapter?.name ?? '';

  const onCopy = async (): Promise<void> => {
    const copied = await copyToClipboard(
      formatAyahForSharing({ text: verse.text, surahName, surah: verse.surah, ayah: verse.ayah }),
    );
    toast(copied ? 'تم نسخ الآية' : 'تعذّر النسخ إلى الحافظة', {
      tone: copied ? 'success' : 'error',
    });
  };

  return (
    <Card className="relative overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0,var(--accent-soft),transparent_58%)]"
      />

      <div className="relative">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Icon name="sparkle" size={14} />
          آية اليوم
        </p>

        <blockquote className="mt-4">
          <p className="quran-text text-ink" dir="rtl" lang="ar">
            {verse.text}
            <span className="ayah-medallion" aria-hidden="true">
              {verse.numberInSurah}
            </span>
          </p>
        </blockquote>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={ROUTES.surahAyah(verse.surah, verse.ayah)}
            className="rounded-xs text-sm font-semibold text-primary hover:underline"
          >
            {surahName} · الآية {toArabicNumerals(verse.ayah)}
          </Link>

          <div className="flex items-center gap-0.5">
            <IconButton
              icon="play"
              label="استمع لآية اليوم"
              size="sm"
              onClick={() => play({ surah: verse.surah, ayah: verse.ayah, queue: [verse.ayah] })}
            />
            <IconButton icon="copy" label="نسخ آية اليوم" size="sm" onClick={onCopy} />
          </div>
        </div>
      </div>
    </Card>
  );
}
