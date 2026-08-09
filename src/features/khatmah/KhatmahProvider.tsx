'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '@/constants';
import { useBookmarks } from '@/features/bookmarks/BookmarksProvider';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getChapter, getPageByVerseId } from '@/services/quran';
import {
  advancePlan,
  computeDailyPortion,
  createPlan,
  dayKey,
  parsePlan,
  type DailyPortion,
  type KhatmahPlan,
} from './plan';

type KhatmahContextValue = {
  readonly plan: KhatmahPlan | null;
  readonly portion: DailyPortion | null;
  readonly hydrated: boolean;
  readonly start: (days: number) => void;
  readonly abandon: () => void;
  /** Marks today's portion read, for a reader who finished it elsewhere. */
  readonly completeToday: () => void;
};

const KhatmahContext = createContext<KhatmahContextValue | null>(null);

/**
 * The khatmah plan.
 *
 * Progress advances from where the reader actually reaches rather than from a
 * button they have to remember to press: the reading position is already
 * tracked precisely, so translating it into pages costs nothing and means the
 * plan is always honest about what has been read.
 *
 * Local to the device like everything else here — no account, no sync.
 */
export function KhatmahProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const {
    value: plan,
    setValue: setPlan,
    hydrated,
  } = useLocalStorage<KhatmahPlan | null>(STORAGE_KEYS.khatmah, null, parsePlan);

  const { lastRead } = useBookmarks();

  /**
   * Follows the reader's position into the plan.
   *
   * A page counts as finished once the reader has moved past its last verse,
   * so being partway down page 12 records 11 — the plan should never claim
   * credit for a page still being read.
   */
  useEffect(() => {
    if (!hydrated || !plan || !lastRead) return;

    const chapter = getChapter(lastRead.surah);
    if (!chapter) return;

    const verseId = chapter.firstVerseId + lastRead.ayah - 1;
    const page = getPageByVerseId(verseId);
    if (!page) return;

    const reached = page.id - 1;
    if (reached <= plan.completedPages) return;

    setPlan((current) => (current ? advancePlan(current, reached) : current));
  }, [hydrated, plan, lastRead, setPlan]);

  const start = useCallback((days: number) => setPlan(createPlan(days)), [setPlan]);
  const abandon = useCallback(() => setPlan(null), [setPlan]);

  const completeToday = useCallback(() => {
    setPlan((current) => {
      if (!current) return current;
      const portion = computeDailyPortion(current);
      return advancePlan(current, portion.to);
    });
  }, [setPlan]);

  /**
   * Recomputed on every render rather than memoised on the plan alone: the
   * portion depends on today's date, and a tab left open overnight must show
   * the new day's portion, not yesterday's.
   */
  const portion = plan ? computeDailyPortion(plan, dayKey()) : null;

  const value = useMemo<KhatmahContextValue>(
    () => ({ plan, portion, hydrated, start, abandon, completeToday }),
    [plan, portion, hydrated, start, abandon, completeToday],
  );

  return <KhatmahContext.Provider value={value}>{children}</KhatmahContext.Provider>;
}

/** Access the khatmah plan. Must be used under a `KhatmahProvider`. */
export function useKhatmah(): KhatmahContextValue {
  const context = useContext(KhatmahContext);
  if (!context) {
    throw new Error('useKhatmah must be used within a KhatmahProvider');
  }
  return context;
}
