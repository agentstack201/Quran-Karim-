'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ROUTES } from '@/constants';
import { Icon } from '@/components/ui';
import { getChapter, getPage } from '@/services/quran';
import { dayKey, toArabicNumerals } from '@/utils';
import type { MemoryUnit, MemoryUnitKey } from './model';
import { currentRetrievability } from './srs';

/**
 * The weakest pages, as a list you can actually use.
 *
 * The heatmap answers *where am I weak* as a picture. This answers it as a set
 * of links — full-size targets, keyboard reachable, and readable by a screen
 * reader in the order that matters rather than in Mus'haf order.
 *
 * The two halves exist because one component cannot be both. A 604-cell
 * overview needs 12px cells, and a 12px cell is not a control anybody can hit;
 * trying to make the map navigable was how this failed WCAG 2.5.8 in the first
 * place. So the map shows the shape and the list does the work.
 */

/** How many to show. Enough to act on, short enough not to become a backlog. */
const LIMIT = 8;

export type WeakPagesProps = {
  readonly units: ReadonlyMap<MemoryUnitKey, MemoryUnit>;
};

type Weak = {
  readonly page: number;
  readonly unit: MemoryUnit;
  readonly recall: number;
};

/** Names the surahs on a page, so a reader recognises it without opening it. */
function describePage(page: number): string {
  const meta = getPage(page);
  if (!meta) return '';
  return meta.surahs
    .map((id) => getChapter(id)?.name)
    .filter(Boolean)
    .join(' · ');
}

export function WeakPages({ units }: WeakPagesProps): React.JSX.Element | null {
  const today = dayKey();

  const weakest = useMemo(() => {
    const scored: Weak[] = [];

    for (const unit of units.values()) {
      if (unit.type !== 'page') continue;
      const recall = currentRetrievability(unit, today);
      // Only pages actually slipping. A list padded with healthy pages to reach
      // a round number would train the reader to ignore it.
      if (recall >= 0.9) continue;
      scored.push({ page: unit.id, unit, recall });
    }

    return scored
      .sort((a, b) => (a.recall === b.recall ? a.page - b.page : a.recall - b.recall))
      .slice(0, LIMIT);
  }, [units, today]);

  if (weakest.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold text-ink">أضعف صفحاتك الآن</h3>
      <ul className="space-y-1.5">
        {weakest.map(({ page, unit, recall }) => (
          <li key={page}>
            <Link
              href={ROUTES.page(page)}
              // min-h-11 is 44px: a real target, unlike the map's cells.
              className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-surface px-3.5 py-2 transition-colors hover:border-primary/50 hover:bg-primary-soft/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="min-w-0">
                <span className="font-bold text-ink">صفحة {toArabicNumerals(page)}</span>
                <span className="ms-2 text-xs text-ink-subtle">{describePage(page)}</span>
              </span>

              <span className="flex shrink-0 items-center gap-2 text-xs text-ink-muted">
                {unit.lapses > 0 && (
                  <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 text-accent">
                    انكسرت {toArabicNumerals(unit.lapses)}
                  </span>
                )}
                {/*
                 * A percentage, not a colour swatch. The map already carries the
                 * colour; repeating it here would give a reader who cannot
                 * separate the greens two useless signals instead of one useful
                 * number.
                 */}
                <span className="tabular-nums">{toArabicNumerals(Math.round(recall * 100))}٪</span>
                <Icon name="chevronStart" size={14} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
