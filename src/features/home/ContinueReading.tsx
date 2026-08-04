'use client';

import Link from 'next/link';
import { ROUTES } from '@/constants';
import { Card, Icon, Skeleton } from '@/components/ui';
import { useBookmarks } from '@/features/bookmarks/BookmarksProvider';
import { getChapter } from '@/services/quran';
import { formatRelativeTime, toArabicNumerals } from '@/utils';

/**
 * بطاقة «متابعة القراءة».
 *
 * تُعرض هيكلاً مؤقتاً (skeleton) قبل قراءة التخزين المحلي بدل الاختفاء ثم
 * الظهور المفاجئ — القفز في التخطيط بعد التحميل تجربة رديئة، وهو ما تقيسه
 * درجة Cumulative Layout Shift مباشرةً.
 *
 * وإذا لم يقرأ المستخدم شيئاً بعد، تتحوّل البطاقة إلى دعوة للبدء بالفاتحة
 * بدلاً من أن تكون فراغاً بلا معنى.
 */
export function ContinueReading(): React.JSX.Element {
  const { lastRead, hydrated } = useBookmarks();

  if (!hydrated) {
    return (
      <Card className="p-5" aria-busy="true">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-6 w-40" />
        <Skeleton className="mt-2.5 h-3 w-28" />
      </Card>
    );
  }

  if (!lastRead) {
    const fatihah = getChapter(1);
    return (
      <Card interactive className="p-5">
        <Link href={ROUTES.surah(1)} className="block">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-subtle">
            <Icon name="mushaf" size={14} />
            ابدأ القراءة
          </p>
          <h3 className="mt-2.5 font-quran text-2xl text-ink">{fatihah?.name ?? 'الفاتحة'}</h3>
          <p className="mt-1.5 text-sm text-ink-muted">
            افتح المصحف من أوله — سيُحفظ موضعك تلقائياً لتُكمل لاحقاً.
          </p>
          <span className="mt-3.5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            افتح الفاتحة
            <Icon name="arrowStart" size={16} />
          </span>
        </Link>
      </Card>
    );
  }

  const chapter = getChapter(lastRead.surah);

  return (
    <Card interactive className="p-5">
      <Link href={ROUTES.surahAyah(lastRead.surah, lastRead.ayah)} className="block">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Icon name="clock" size={14} />
          آخر قراءة · {formatRelativeTime(lastRead.timestamp)}
        </p>

        <h3 className="mt-2.5 font-quran text-2xl text-ink">
          {chapter?.name ?? lastRead.surahName}
        </h3>

        <p className="mt-1.5 text-sm text-ink-muted">
          الآية {toArabicNumerals(lastRead.ayah)}
          {chapter && <> من {toArabicNumerals(chapter.versesCount)}</>}
        </p>

        {chapter && (
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={chapter.versesCount}
            aria-valuenow={lastRead.ayah}
            aria-label={`تقدّم القراءة في ${chapter.name}`}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-out-soft)]"
              style={{ width: `${(lastRead.ayah / chapter.versesCount) * 100}%` }}
            />
          </div>
        )}

        <span className="mt-3.5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          تابع القراءة
          <Icon name="arrowStart" size={16} />
        </span>
      </Link>
    </Card>
  );
}
