import { ROUTES } from '@/constants';
import { CardLink } from '@/components/ui';
import { getChapter } from '@/services/quran';
import type { Hizb, Juz } from '@/types';
import { toArabicNumerals } from '@/utils';

/**
 * A juz or hizb entry in the index.
 *
 * Both are the same shape — an ordinal, a span of the Mus'haf and a verse count
 * — so they share one component rather than two near-identical ones.
 */
export function PartCard({
  part,
  kind,
}: {
  readonly part: Juz | Hizb;
  readonly kind: 'juz' | 'hizb';
}): React.JSX.Element {
  const start = getChapter(part.start.surah);
  const end = getChapter(part.end.surah);
  const href = kind === 'juz' ? ROUTES.juz(part.id) : ROUTES.hizb(part.id);

  return (
    <CardLink href={href} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-ink">{part.name}</h3>
          <p className="mt-1 truncate text-xs text-ink-subtle">
            {start && end ? (
              <>
                {start.name} {toArabicNumerals(part.start.ayah)} — {end.name}{' '}
                {toArabicNumerals(part.end.ayah)}
              </>
            ) : (
              `${toArabicNumerals(part.versesCount)} آية`
            )}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-sm font-bold text-primary tabular-nums transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110"
        >
          {toArabicNumerals(part.id)}
        </span>
      </div>

      <dl className="mt-3.5 flex items-center gap-4 text-[0.6875rem] text-ink-subtle">
        <div className="flex gap-1">
          <dt>الآيات</dt>
          <dd className="font-semibold text-ink-muted">{toArabicNumerals(part.versesCount)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>الصفحات</dt>
          <dd className="font-semibold text-ink-muted">
            {toArabicNumerals(part.startPage)}–{toArabicNumerals(part.endPage)}
          </dd>
        </div>
        {'juz' in part && (
          <div className="flex gap-1">
            <dt>الجزء</dt>
            <dd className="font-semibold text-ink-muted">{toArabicNumerals(part.juz)}</dd>
          </div>
        )}
      </dl>
    </CardLink>
  );
}
