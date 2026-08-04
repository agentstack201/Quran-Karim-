import { ROUTES } from '@/constants';
import { CardLink } from '@/components/ui';
import type { Chapter } from '@/types';
import { toArabicNumerals } from '@/utils';

/**
 * A surah entry in the index.
 *
 * The number sits in a rotated square — the classic Mus'haf ornament — which
 * gives the grid a strong, scannable left edge without needing a border.
 */
export function ChapterCard({ chapter }: { readonly chapter: Chapter }): React.JSX.Element {
  return (
    <CardLink href={ROUTES.surah(chapter.id)} className="flex items-center gap-3.5 p-3.5">
      <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
        <span className="absolute inset-0 rotate-45 rounded-[0.5rem] border border-ornament bg-accent-soft/60 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:rotate-[135deg]" />
        <span className="relative text-sm font-bold text-accent tabular-nums">
          {toArabicNumerals(chapter.id)}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-quran text-xl leading-tight text-ink">
          {chapter.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-ink-subtle">
          {chapter.transliteration} · {chapter.translation}
        </span>
      </span>

      <span className="shrink-0 text-end">
        <span className="block text-xs font-medium text-ink-muted">
          {toArabicNumerals(chapter.versesCount)} آية
        </span>
        <span className="mt-0.5 block text-[0.6875rem] text-ink-subtle">
          {chapter.revelation === 'meccan' ? 'مكية' : 'مدنية'}
        </span>
      </span>
    </CardLink>
  );
}
