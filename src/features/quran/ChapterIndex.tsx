'use client';

import { useMemo, useState } from 'react';
import { EmptyState, Icon, SegmentedControl, type SegmentOption } from '@/components/ui';
import { CHAPTERS } from '@/services/quran';
import type { Chapter } from '@/types';
import { cn, normaliseArabic, toArabicNumerals } from '@/utils';
import { ChapterCard } from './ChapterCard';

type SortMode = 'mushaf' | 'revelation' | 'length';
type RevelationFilter = 'all' | 'meccan' | 'medinan';

const SORT_OPTIONS: readonly SegmentOption<SortMode>[] = [
  { value: 'mushaf', label: 'ترتيب المصحف' },
  { value: 'revelation', label: 'ترتيب النزول' },
  { value: 'length', label: 'عدد الآيات' },
];

const FILTER_OPTIONS: readonly SegmentOption<RevelationFilter>[] = [
  { value: 'all', label: 'الكل' },
  { value: 'meccan', label: 'مكية' },
  { value: 'medinan', label: 'مدنية' },
];

/**
 * فهرس السور الكامل مع ترشيح وترتيب وبحث فوري.
 *
 * كل شيء يعمل محلياً على البيانات المضمّنة — لا شبكة ولا انتظار — لأن بيانات
 * السور الوصفية جزء من الحزمة أصلاً. لذلك يستجيب الحقل فور الكتابة حتى دون
 * اتصال.
 */
export function ChapterIndex(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('mushaf');
  const [filter, setFilter] = useState<RevelationFilter>('all');

  const chapters = useMemo<readonly Chapter[]>(() => {
    const needle = normaliseArabic(query).toLowerCase();
    const asNumber = Number(query.trim());

    const filtered = CHAPTERS.filter((chapter) => {
      if (filter !== 'all' && chapter.revelation !== filter) return false;
      if (needle.length === 0) return true;

      if (Number.isInteger(asNumber) && asNumber > 0) return chapter.id === asNumber;

      return (
        normaliseArabic(chapter.nameSimple).toLowerCase().includes(needle) ||
        chapter.transliteration.toLowerCase().includes(needle) ||
        chapter.translation.toLowerCase().includes(needle)
      );
    });

    // `toSorted` keeps the bundled dataset immutable — sorting in place would
    // permanently reorder the module-level array for every other consumer.
    switch (sort) {
      case 'revelation':
        return filtered.toSorted((a, b) => a.revelationOrder - b.revelationOrder);
      case 'length':
        return filtered.toSorted((a, b) => b.versesCount - a.versesCount);
      case 'mushaf':
      default:
        return filtered.toSorted((a, b) => a.id - b.id);
    }
  }, [query, sort, filter]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-6 space-y-4">
        <div className="relative">
          <label htmlFor="chapter-filter" className="sr-only">
            ابحث في أسماء السور
          </label>
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute inset-y-0 start-4 my-auto text-ink-subtle"
          />
          <input
            id="chapter-filter"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اسم السورة أو رقمها…"
            autoComplete="off"
            className={cn(
              'h-12 w-full rounded-md border border-border bg-surface ps-12 pe-4 text-sm text-ink',
              'transition-colors duration-200 hover:border-border-strong',
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            label="ترتيب السور"
            size="sm"
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
          />
          <SegmentedControl
            label="ترشيح حسب مكان النزول"
            size="sm"
            options={FILTER_OPTIONS}
            value={filter}
            onChange={setFilter}
          />
          <p className="ms-auto text-xs text-ink-subtle" role="status" aria-live="polite">
            {toArabicNumerals(chapters.length)} سورة
          </p>
        </div>
      </div>

      {chapters.length === 0 ? (
        <EmptyState
          icon="search"
          title="لا توجد سورة مطابقة"
          message="جرّب اسماً آخر، أو اكتب رقم السورة، أو أزل الترشيح."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <ChapterCard chapter={chapter} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
