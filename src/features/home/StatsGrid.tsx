'use client';

import { TOTAL_CHAPTERS, TOTAL_JUZ, TOTAL_VERSES } from '@/constants';
import { Icon, Skeleton, type IconName } from '@/components/ui';
import { useBookmarks } from '@/features/bookmarks/BookmarksProvider';
import { cn, pluralise, toArabicNumerals } from '@/utils';

type Stat = {
  readonly icon: IconName;
  readonly value: string;
  readonly label: string;
  readonly tone: 'primary' | 'accent';
};

/**
 * شبكة الإحصاءات.
 *
 * تجمع بين ثابتٍ عن المصحف نفسه وشخصيٍّ عن قراءة المستخدم، فتبقى البطاقة ذات
 * معنى منذ الزيارة الأولى بدل أن تعرض أصفاراً. الأرقام الشخصية محلية بالكامل —
 * لا يغادر أيٌّ منها الجهاز.
 */
export function StatsGrid(): React.JSX.Element {
  const { stats, hydrated } = useBookmarks();

  const items: readonly Stat[] = [
    {
      icon: 'book',
      value: toArabicNumerals(TOTAL_CHAPTERS),
      label: 'سورة في المصحف',
      tone: 'primary',
    },
    {
      icon: 'mushaf',
      value: toArabicNumerals(TOTAL_VERSES),
      label: 'آية بالرسم العثماني',
      tone: 'primary',
    },
    {
      icon: 'bookmark',
      value: toArabicNumerals(stats.bookmarkCount),
      label: pluralise(stats.bookmarkCount, {
        one: 'آية محفوظة',
        two: 'آيتان محفوظتان',
        few: 'آيات محفوظة',
        many: 'آية محفوظة',
      }),
      tone: 'accent',
    },
    {
      icon: 'layers',
      value: toArabicNumerals(stats.surahsVisited),
      label: `سورة قرأتها من ${toArabicNumerals(TOTAL_CHAPTERS)}`,
      tone: 'accent',
    },
    {
      icon: 'sparkle',
      value: toArabicNumerals(stats.streakDays),
      label: pluralise(stats.streakDays, {
        one: 'يوم متتابع',
        two: 'يومان متتابعان',
        few: 'أيام متتابعة',
        many: 'يوماً متتابعاً',
      }),
      tone: 'accent',
    },
    {
      icon: 'grid',
      value: toArabicNumerals(TOTAL_JUZ),
      label: 'جزءاً للتصفّح',
      tone: 'primary',
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((stat) => {
        const personal = stat.tone === 'accent';
        return (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface px-3 py-5 text-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid size-9 place-items-center rounded-md',
                personal ? 'bg-accent-soft text-accent' : 'bg-primary-soft text-primary',
              )}
            >
              <Icon name={stat.icon} size={17} />
            </span>

            {personal && !hydrated ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <dd className="text-xl font-bold text-ink tabular-nums">{stat.value}</dd>
            )}

            <dt className="text-[0.6875rem] leading-tight text-ink-subtle">{stat.label}</dt>
          </div>
        );
      })}
    </dl>
  );
}
