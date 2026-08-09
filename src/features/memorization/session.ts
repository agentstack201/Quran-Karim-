import { TOTAL_PAGES } from '@/constants';
import type { DayKey } from '@/utils';
import { TOTAL_LINKS, unitKey, type MemoryUnit, type MemoryUnitKey } from './model';
import { createUnit, currentRetrievability, isDue } from './srs';

/**
 * Building the day's session.
 * -----------------------------------------------------------------------------
 * The scheduler answers one question — *what should I do today?* — and the hard
 * part is not which units are due. It is what to do when far too many are.
 *
 * ## Never show the backlog
 *
 * A memoriser who opens the app to "47 pages due" closes it. That number is
 * true, useless and demoralising, and the feeling it produces is the single
 * most common reason people abandon a review habit. So the reader states how
 * much time they have, and the session is filled to *that* — highest priority
 * first. The backlog exists, the scheduler knows about it, and the reader is
 * shown a day's work.
 *
 * ## Stop new memorisation when review debt is high
 *
 * Every teacher of ḥifẓ says the same thing: do not add new pages on top of
 * crumbling old ones. Almost no app enforces it, because "new page memorised"
 * feels like progress and "review your backlog" does not. This one enforces it,
 * and says why.
 */

/** Composition of a day's session, as fractions of the budget. */
const MIX = {
  /** Due reviews — the bulk of any real ḥifẓ routine. */
  review: 0.6,
  /** New pages, only when the reader has earned the room for them. */
  fresh: 0.2,
  /** Weakest units, whether or not they are technically due. */
  weak: 0.1,
  /** Page-to-page joins. */
  link: 0.1,
} as const;

/**
 * Review debt above which new memorisation stops, as a multiple of the daily
 * budget. Three days' worth of arrears is a wobble; more is a trend, and adding
 * to it makes the wobble permanent.
 */
export const NEW_WORK_DEBT_LIMIT = 3;

/** A unit selected for today, with the reason it was chosen. */
export type SessionItem = {
  readonly unit: MemoryUnit;
  readonly key: MemoryUnitKey;
  /** Why this item is in today's session — surfaced in the UI, not decoration. */
  readonly reason: 'due' | 'fresh' | 'weak' | 'link';
  /** Recall probability right now, 0–1. */
  readonly retrievability: number;
};

export type DailySession = {
  readonly items: readonly SessionItem[];
  /** Units due today, including those that did not fit in the budget. */
  readonly dueTotal: number;
  /** Due units left over after the budget was filled. */
  readonly backlog: number;
  /** True when review debt has suspended new memorisation. */
  readonly newWorkPaused: boolean;
  /** Pages memorised at all, of 604. */
  readonly memorisedPages: number;
};

export type SessionOptions = {
  /** How many units the reader has time for today. */
  readonly budget: number;
  /**
   * Pages the reader wants to memorise next, in order. Empty means they are
   * only reviewing — a complete and common way to use the app.
   */
  readonly queue: readonly number[];
  /** Retention target, 0.5–0.99. Higher means more frequent reviews. */
  readonly target?: number;
};

/** Ranks by weakest recall first — the unit closest to being lost. */
function byRetrievability(a: SessionItem, b: SessionItem): number {
  if (a.retrievability !== b.retrievability) return a.retrievability - b.retrievability;
  // Ties break in Mus'haf order so a session reads in a familiar sequence
  // rather than jumping around the Quran for no reason the reader can see.
  return a.unit.id - b.unit.id;
}

/**
 * Builds today's session.
 *
 * @param units Every unit the reader has any history with, keyed as in `model`.
 */
export function buildDailySession(
  units: ReadonlyMap<MemoryUnitKey, MemoryUnit>,
  today: DayKey,
  options: SessionOptions,
): DailySession {
  const budget = Math.max(1, Math.floor(options.budget));
  const target = options.target;

  const due: SessionItem[] = [];
  const weak: SessionItem[] = [];
  const links: SessionItem[] = [];
  let memorisedPages = 0;

  for (const [key, unit] of units) {
    if (unit.type === 'page') memorisedPages += 1;

    const recall = currentRetrievability(unit, today);
    const item: SessionItem = { unit, key, reason: 'due', retrievability: recall };

    if (unit.type === 'link') {
      if (isDue(unit, today, target)) links.push({ ...item, reason: 'link' });
      continue;
    }

    if (isDue(unit, today, target)) {
      due.push(item);
    } else if (unit.lapses > 0 && unit.difficulty > 0.5) {
      // Not due, but historically fragile. A page that has broken before and
      // still scores hard is worth touching early rather than waiting for the
      // curve to say so — the curve is fitted to average behaviour, and this
      // unit has already demonstrated it is not average.
      weak.push({ ...item, reason: 'weak' });
    }
  }

  due.sort(byRetrievability);
  weak.sort(byRetrievability);
  links.sort(byRetrievability);

  const dueTotal = due.length;
  const newWorkPaused = dueTotal > budget * NEW_WORK_DEBT_LIMIT;

  // Allowances are computed from the mix, then unclaimed room is handed back to
  // reviews — an empty new-page queue should not shrink the session.
  const reviewSlots = Math.max(1, Math.round(budget * MIX.review));
  const freshSlots = newWorkPaused ? 0 : Math.round(budget * MIX.fresh);
  const weakSlots = Math.round(budget * MIX.weak);
  const linkSlots = Math.round(budget * MIX.link);

  const items: SessionItem[] = [];
  const taken = new Set<MemoryUnitKey>();

  const take = (candidates: readonly SessionItem[], slots: number): void => {
    for (const item of candidates) {
      if (items.length >= budget) return;
      if (slots <= 0) return;
      if (taken.has(item.key)) continue;
      taken.add(item.key);
      items.push(item);
      slots -= 1;
    }
  };

  take(due, reviewSlots);
  take(weak, weakSlots);
  take(links, linkSlots);

  // New pages: whatever the reader queued, skipping any they already track.
  if (freshSlots > 0) {
    const fresh: SessionItem[] = [];
    for (const page of options.queue) {
      if (!Number.isInteger(page) || page < 1 || page > TOTAL_PAGES) continue;
      const key = unitKey('page', page);
      if (units.has(key)) continue;
      fresh.push({
        unit: createUnit('page', page),
        key,
        reason: 'fresh',
        retrievability: 0,
      });
    }
    take(fresh, freshSlots);
  }

  // Any budget still unspent goes back to reviews — the reader offered the
  // time, and unreviewed pages are always the best thing to spend it on.
  take(due, budget - items.length);
  take(links, budget - items.length);

  return {
    items,
    dueTotal,
    backlog: Math.max(0, dueTotal - items.filter((item) => item.reason === 'due').length),
    newWorkPaused,
    memorisedPages,
  };
}

// ---------------------------------------------------------------------------
// Aggregate progress
// ---------------------------------------------------------------------------

export type MemorizationProgress = {
  /** Pages with any history, of 604. */
  readonly pages: number;
  /** Pages whose recall is currently at or above the target. */
  readonly strong: number;
  /** Pages tracked but currently below target — the honest "needs work". */
  readonly fading: number;
  /** Links with any history, of 603. */
  readonly links: number;
  /** Mean recall across tracked pages, 0–1. */
  readonly meanRetrievability: number;
  /** Whole juzʾ (30) in which every page is tracked. */
  readonly completeJuz: number;
};

/**
 * Aggregate standing, for the dashboard.
 *
 * Reports `fading` separately from `strong` rather than folding both into a
 * single percentage. "You have memorised 240 pages" and "31 of them are
 * slipping" are different facts, and a memoriser needs the second one more.
 */
export function summariseProgress(
  units: ReadonlyMap<MemoryUnitKey, MemoryUnit>,
  today: DayKey,
  pageToJuz: (page: number) => number,
  target: number = 0.9,
): MemorizationProgress {
  let pages = 0;
  let links = 0;
  let strong = 0;
  let totalRecall = 0;

  const juzPages = new Map<number, number>();

  for (const unit of units.values()) {
    if (unit.type === 'link') {
      links += 1;
      continue;
    }

    pages += 1;
    const recall = currentRetrievability(unit, today);
    totalRecall += recall;
    if (recall >= target) strong += 1;

    const juz = pageToJuz(unit.id);
    juzPages.set(juz, (juzPages.get(juz) ?? 0) + 1);
  }

  let completeJuz = 0;
  for (const [juz, count] of juzPages) {
    if (count >= pagesInJuz(juz, pageToJuz)) completeJuz += 1;
  }

  return {
    pages,
    strong,
    fading: pages - strong,
    links,
    meanRetrievability: pages === 0 ? 0 : totalRecall / pages,
    completeJuz,
  };
}

/** Cached page counts per juzʾ, computed once from the page→juzʾ mapping. */
const juzSizes = new Map<number, number>();

function pagesInJuz(juz: number, pageToJuz: (page: number) => number): number {
  const cached = juzSizes.get(juz);
  if (cached !== undefined) return cached;

  let count = 0;
  for (let page = 1; page <= TOTAL_PAGES; page += 1) {
    if (pageToJuz(page) === juz) count += 1;
  }

  juzSizes.set(juz, count);
  return count;
}

/** Total schedulable units, for progress denominators. */
export const TOTAL_UNITS = TOTAL_PAGES + TOTAL_LINKS;
