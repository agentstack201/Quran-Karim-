'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS, TOTAL_PAGES } from '@/constants';
import { useIsClient } from '@/hooks';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getPage } from '@/services/quran';
import { dayKey, type DayKey } from '@/utils';
import {
  gradeFromOutcome,
  unitKey,
  type MemoryUnit,
  type MemoryUnitKey,
  type MemoryUnitType,
  type ReviewOutcome,
} from './model';
import {
  buildDailySession,
  summariseProgress,
  type DailySession,
  type MemorizationProgress,
} from './session';
import { applyNeighbourReinforcement, applyReview, createUnit, seedKnownUnit } from './srs';
import { getServerSnapshot, getSnapshot, save, subscribe } from './store';

/** How many units a reader takes on per day, until they say otherwise. */
export const DEFAULT_DAILY_BUDGET = 8;

export type MemorizationSettings = {
  /** Units per day. */
  readonly budget: number;
  /** Pages queued for new memorisation, in order. */
  readonly queue: readonly number[];
};

const DEFAULT_SETTINGS: MemorizationSettings = { budget: DEFAULT_DAILY_BUDGET, queue: [] };

type MemorizationContextValue = {
  readonly units: ReadonlyMap<MemoryUnitKey, MemoryUnit>;
  readonly settings: MemorizationSettings;
  readonly session: DailySession;
  readonly progress: MemorizationProgress;
  readonly hydrated: boolean;
  /** True when the reader has never tracked anything. */
  readonly empty: boolean;
  readonly review: (type: MemoryUnitType, id: number, outcome: ReviewOutcome) => void;
  /** Declares a page range already memorised, without pretending it was reviewed. */
  readonly seedRange: (
    from: number,
    to: number,
    confidence: 'strong' | 'moderate' | 'weak',
  ) => number;
  readonly forget: (type: MemoryUnitType, id: number) => void;
  readonly setBudget: (budget: number) => void;
  readonly setQueue: (queue: readonly number[]) => void;
  readonly reset: () => void;
};

const MemorizationContext = createContext<MemorizationContextValue | null>(null);

function parseSettings(raw: unknown): MemorizationSettings | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const stored = raw as Record<string, unknown>;

  const budget =
    typeof stored.budget === 'number' && Number.isFinite(stored.budget)
      ? Math.min(60, Math.max(1, Math.round(stored.budget)))
      : DEFAULT_DAILY_BUDGET;

  const queue = Array.isArray(stored.queue)
    ? stored.queue.filter(
        (page): page is number => Number.isInteger(page) && page >= 1 && page <= TOTAL_PAGES,
      )
    : [];

  return { budget, queue };
}

/** The juzʾ a page belongs to, from the bundled Mus'haf index. */
function pageToJuz(page: number): number {
  return getPage(page)?.juz[0] ?? 1;
}

/**
 * The memorisation engine's state.
 *
 * Everything here is local to the device. No account, no sync, no server — the
 * same constraint the rest of the application lives under, and the reason this
 * feature can exist at all without a bill attached to it.
 *
 * ⚠ LocalStorage is the right store *for this shape of data*: at most 1207
 * records of nine small fields, around 30 kB serialised, written a handful of
 * times per session. It will stop being the right store the moment per-word
 * error history arrives with recitation checking — thousands of records
 * written continuously during a session, on an API that blocks the main
 * thread. That is the point at which this moves to IndexedDB, and it is a
 * migration to plan for rather than a reason to over-build now.
 */
export function MemorizationProvider({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const units = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const commit = save;

  // The store's own two snapshots handle hydration; this only tells the UI
  // whether it is looking at a real history yet, so it can hold back an
  // "empty" message that would otherwise flash on every load.
  const onClient = useIsClient();

  const {
    value: settings,
    setValue: setSettings,
    hydrated: settingsHydrated,
  } = useLocalStorage<MemorizationSettings>(
    STORAGE_KEYS.memorizationSettings,
    DEFAULT_SETTINGS,
    parseSettings,
  );

  const hydrated = onClient && settingsHydrated;

  const review = useCallback(
    (type: MemoryUnitType, id: number, outcome: ReviewOutcome) => {
      const today = dayKey();
      const grade = gradeFromOutcome(outcome);

      commit((units) => {
        const key = unitKey(type, id);
        const existing = units.get(key) ?? createUnit(type, id);
        units.set(key, applyReview(existing, grade, today));

        // Reciting a page carries you into its neighbours' edges, so they gain
        // a fraction of what a real review would have given them — never
        // enough to substitute for one, and never marked as reviewed.
        if (type === 'page') {
          for (const neighbour of [id - 1, id + 1]) {
            if (neighbour < 1 || neighbour > TOTAL_PAGES) continue;
            const neighbourKey = unitKey('page', neighbour);
            const unit = units.get(neighbourKey);
            if (!unit) continue;
            units.set(neighbourKey, applyNeighbourReinforcement(unit, grade, today));
          }
        }

        return units;
      });
    },
    [commit],
  );

  /**
   * Declares a range already memorised.
   *
   * A ḥāfiẓ with fifteen juzʾ cannot be asked to tap through three hundred
   * pages before the app is of any use to them, and starting them from zero
   * would bury them in fabricated review debt on their first day.
   *
   * Existing units are left alone: this adds what is missing rather than
   * overwriting a real history with a declaration.
   *
   * @returns how many units were actually added.
   */
  const seedRange = useCallback(
    (from: number, to: number, confidence: 'strong' | 'moderate' | 'weak'): number => {
      const start = Math.max(1, Math.min(from, to));
      const end = Math.min(TOTAL_PAGES, Math.max(from, to));
      if (!Number.isInteger(start) || !Number.isInteger(end)) return 0;

      const today = dayKey();
      let added = 0;

      commit((units) => {
        for (let page = start; page <= end; page += 1) {
          const key = unitKey('page', page);
          if (units.has(key)) continue;
          units.set(key, seedKnownUnit('page', page, confidence, today));
          added += 1;
        }

        // The joins inside the range come along with it — they are part of what
        // the reader is declaring. The join out of the last page is not: it
        // leads into a page they did not claim.
        for (let page = start; page < end; page += 1) {
          const key = unitKey('link', page);
          if (units.has(key)) continue;
          units.set(key, seedKnownUnit('link', page, confidence, today));
        }

        return units;
      });

      return added;
    },
    [commit],
  );

  const forget = useCallback(
    (type: MemoryUnitType, id: number) => {
      commit((units) => {
        units.delete(unitKey(type, id));
        return units;
      });
    },
    [commit],
  );

  const setBudget = useCallback(
    (budget: number) => {
      setSettings((current) => ({
        ...current,
        budget: Math.min(60, Math.max(1, Math.round(budget))),
      }));
    },
    [setSettings],
  );

  const setQueue = useCallback(
    (queue: readonly number[]) => setSettings((current) => ({ ...current, queue })),
    [setSettings],
  );

  const reset = useCallback(() => {
    commit(() => new Map());
    setSettings(DEFAULT_SETTINGS);
  }, [commit, setSettings]);

  /**
   * Recomputed every render rather than memoised on the unit map alone.
   *
   * Both depend on today's date, and a tab left open overnight must show the
   * new day's session — not yesterday's, with everything already ticked off.
   */
  const today: DayKey = dayKey();
  const session = buildDailySession(units, today, {
    budget: settings.budget,
    queue: settings.queue,
  });
  const progress = summariseProgress(units, today, pageToJuz);

  const value = useMemo<MemorizationContextValue>(
    () => ({
      units,
      settings,
      session,
      progress,
      hydrated,
      empty: units.size === 0,
      review,
      seedRange,
      forget,
      setBudget,
      setQueue,
      reset,
    }),
    [
      units,
      settings,
      session,
      progress,
      hydrated,
      review,
      seedRange,
      forget,
      setBudget,
      setQueue,
      reset,
    ],
  );

  return <MemorizationContext.Provider value={value}>{children}</MemorizationContext.Provider>;
}

/** Access the memorisation engine. Must be used under a `MemorizationProvider`. */
export function useMemorization(): MemorizationContextValue {
  const context = useContext(MemorizationContext);
  if (!context) {
    throw new Error('useMemorization must be used within a MemorizationProvider');
  }
  return context;
}
