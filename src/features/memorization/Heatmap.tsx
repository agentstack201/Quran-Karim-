'use client';

import { useMemo, useState } from 'react';
import { TOTAL_PAGES } from '@/constants';
import { getPage } from '@/services/quran';
import { cn, dayKey, toArabicNumerals } from '@/utils';
import { unitKey, type MemoryUnit, type MemoryUnitKey } from './model';
import { currentRetrievability } from './srs';

/**
 * The whole Mus'haf, as one picture.
 * -----------------------------------------------------------------------------
 * 604 cells, one per page, shaded by how well the reader currently holds it.
 *
 * The reason this earns its place is not that it looks impressive. A ḥāfiẓ
 * lives with a diffuse, permanent anxiety — *my memorisation is slipping and I
 * do not know where*. That feeling has no shape, so it cannot be acted on. This
 * screen gives it one: it converts an unbounded worry into a finite, ordered
 * list of pages, which is a thing a person can actually do something about.
 *
 * It also costs almost nothing. No model, no server, no new data — it is a
 * rendering of numbers the scheduler already keeps.
 */

/** Five bands, from unmemorised to solid. */
type Band = 0 | 1 | 2 | 3 | 4;

/**
 * Cell appearance per band.
 *
 * Colour is never the only signal. Each band also carries a distinct fill
 * pattern and its own words in the accessible name, because roughly one man in
 * twelve cannot reliably separate these greens, and a memoriser who cannot read
 * the map is exactly the reader this feature exists for.
 */
const BANDS: Record<
  Band,
  { readonly label: string; readonly cell: string; readonly swatch: string }
> = {
  0: {
    label: 'لم تُحفظ',
    cell: 'bg-background-subtle border border-border',
    swatch: 'bg-background-subtle border border-border',
  },
  1: {
    label: 'ضعيفة',
    // Diagonal hatching — the densest pattern, for the weakest pages.
    cell: 'bg-primary/15 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,currentColor_2px,currentColor_3px)] text-primary/40',
    swatch:
      'bg-primary/15 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,currentColor_2px,currentColor_3px)] text-primary/40',
  },
  2: {
    label: 'تحتاج مراجعة',
    cell: 'bg-primary/35 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,currentColor_3px,currentColor_4px)] text-primary/30',
    swatch:
      'bg-primary/35 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,currentColor_3px,currentColor_4px)] text-primary/30',
  },
  3: { label: 'جيدة', cell: 'bg-primary/60', swatch: 'bg-primary/60' },
  4: { label: 'متقنة', cell: 'bg-primary', swatch: 'bg-primary' },
};

const BAND_ORDER: readonly Band[] = [0, 1, 2, 3, 4];

/** Places a page in a band from its current recall probability. */
function bandFor(unit: MemoryUnit | undefined, today: string): Band {
  if (!unit) return 0;
  const recall = currentRetrievability(unit, today);
  if (recall >= 0.9) return 4;
  if (recall >= 0.7) return 3;
  if (recall >= 0.4) return 2;
  return 1;
}

export type HeatmapProps = {
  readonly units: ReadonlyMap<MemoryUnitKey, MemoryUnit>;
};

/**
 * Groups the 604 pages by juzʾ.
 *
 * A flat 604-cell grid is a wall. Juzʾ boundaries are how memorisers already
 * partition the Mus'haf, so the grouping is the one the reader is carrying in
 * their head rather than one imposed by layout convenience.
 */
function useJuzGroups(): readonly { juz: number; pages: readonly number[] }[] {
  return useMemo(() => {
    const groups = new Map<number, number[]>();

    for (let page = 1; page <= TOTAL_PAGES; page += 1) {
      const juz = getPage(page)?.juz[0] ?? 1;
      const existing = groups.get(juz);
      if (existing) existing.push(page);
      else groups.set(juz, [page]);
    }

    return [...groups.entries()]
      .map(([juz, pages]) => ({ juz, pages }))
      .sort((a, b) => a.juz - b.juz);
  }, []);
}

export function Heatmap({ units }: HeatmapProps): React.JSX.Element {
  const today = dayKey();
  const groups = useJuzGroups();
  const [focused, setFocused] = useState<number | null>(null);

  const counts = useMemo(() => {
    const tally: Record<Band, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (let page = 1; page <= TOTAL_PAGES; page += 1) {
      tally[bandFor(units.get(unitKey('page', page)), today)] += 1;
    }
    return tally;
  }, [units, today]);

  return (
    <div>
      {/*
       * The legend is not decoration — it is the only thing that makes the
       * shading mean anything, so it sits above the map rather than below it
       * where a reader would meet the colours before their definitions.
       */}
      <ul className="mb-5 flex flex-wrap gap-x-4 gap-y-2" aria-label="مفتاح الخريطة">
        {BAND_ORDER.map((band) => (
          <li key={band} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span
              aria-hidden="true"
              className={cn('size-3 shrink-0 rounded-xs', BANDS[band].swatch)}
            />
            {BANDS[band].label}
            <span className="text-ink-subtle tabular-nums">({toArabicNumerals(counts[band])})</span>
          </li>
        ))}
      </ul>

      {/*
       * The grid is a picture, not a control surface.
       *
       * It was built as 604 links, which reads well until you measure it: a
       * 12px tap target fails WCAG 2.5.8, and no exemption honestly covers it
       * — nor could anyone actually tap page 313 on a phone. So the map states
       * the situation and the list below it does the navigating, at full size.
       * One `role="img"` with a summary also spares a screen-reader user 604
       * announcements to learn something the summary says in one sentence.
       */}
      <div
        role="img"
        aria-label={`خريطة حفظ المصحف: ${BAND_ORDER.map(
          (band) => `${toArabicNumerals(counts[band])} ${BANDS[band].label}`,
        ).join('، ')}`}
        className="space-y-3"
      >
        {groups.map(({ juz, pages }) => (
          <div key={juz} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="w-8 shrink-0 text-end text-xs text-ink-subtle tabular-nums"
            >
              {toArabicNumerals(juz)}
            </span>
            <div className="flex flex-wrap gap-1">
              {pages.map((page) => (
                <span
                  key={page}
                  aria-hidden="true"
                  onMouseEnter={() => setFocused(page)}
                  onMouseLeave={() => setFocused(null)}
                  title={`صفحة ${toArabicNumerals(page)} — ${BANDS[bandFor(units.get(unitKey('page', page)), today)].label}`}
                  className={cn(
                    'block size-3 rounded-xs',
                    BANDS[bandFor(units.get(unitKey('page', page)), today)].cell,
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/*
       * Hover detail for pointer users, and nothing more — it is marked hidden
       * because the same information already reaches assistive technology
       * through the map's summary and the weak-pages list, and announcing it
       * again on every mouse move would be noise.
       */}
      <p className="mt-4 min-h-6 text-sm text-ink-muted" aria-hidden="true">
        {focused !== null && (
          <>
            صفحة {toArabicNumerals(focused)} —{' '}
            {BANDS[bandFor(units.get(unitKey('page', focused)), today)].label}
          </>
        )}
      </p>
    </div>
  );
}
