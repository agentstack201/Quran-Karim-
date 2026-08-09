import { TOTAL_PAGES } from '@/constants';

/**
 * Khatmah planning.
 * -----------------------------------------------------------------------------
 * A plan turns "I want to finish the Mus'haf" into one answer a day: read from
 * this page to that page. Everything here is pure arithmetic over a stored plan
 * and today's date, so the behaviour that matters most — what happens when
 * someone falls behind — is decided in one readable place and tested directly.
 */

/** Plan lengths offered, in days. */
export const PLAN_LENGTHS = [7, 30, 60, 90, 180, 365] as const;

/** How far a plan may be stretched, so a stored value can never be nonsense. */
export const MIN_PLAN_DAYS = 1;
export const MAX_PLAN_DAYS = 730;

export type KhatmahPlan = {
  /** Local date the plan began, as `YYYY-MM-DD`. */
  readonly startedOn: string;
  readonly days: number;
  /**
   * Highest page finished, 0 before anything is read.
   *
   * Monotonic by design: revisiting Al-Fatihah in the middle of a khatmah is
   * reading, not a reset, and a progress bar that fell backwards for it would
   * be actively discouraging.
   */
  readonly completedPages: number;
  /** Local dates on which the day's portion was met, for the streak. */
  readonly metOn: readonly string[];
};

/** Today's assignment, and the standing needed to explain it. */
export type DailyPortion = {
  /** First page to read, inclusive. */
  readonly from: number;
  /** Last page to read, inclusive. */
  readonly to: number;
  /** Pages in today's portion. */
  readonly pages: number;
  /** Days elapsed since the plan began, starting at 1. */
  readonly day: number;
  /** Days left including today, never below 1. */
  readonly daysLeft: number;
  readonly pagesLeft: number;
  /** 0–100. */
  readonly percent: number;
  /** True once the whole Mus'haf is behind them. */
  readonly finished: boolean;
  /** True when the plan's own deadline has passed but pages remain. */
  readonly overdue: boolean;
};

/** Local date key. Local, not UTC: a reader's day ends at their midnight. */
export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whole days from one date key to another, by calendar day rather than hours. */
export function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

/** Creates a plan starting today. */
export function createPlan(days: number, today: string = dayKey()): KhatmahPlan {
  return {
    startedOn: today,
    days: Math.max(MIN_PLAN_DAYS, Math.min(Math.round(days), MAX_PLAN_DAYS)),
    completedPages: 0,
    metOn: [],
  };
}

/**
 * Works out what to read today.
 *
 * The portion is recomputed every day from what is *left*, never accumulated as
 * a backlog. Miss three days of a thirty-day plan and tomorrow asks for a
 * slightly longer sitting — not for four days at once. Debt that compounds is
 * what makes people abandon a khatmah in the second week, and the arithmetic
 * that produces it is a choice, not a necessity.
 *
 * Once the deadline passes with pages remaining, the plan keeps issuing a
 * day's worth rather than demanding the remainder in one sitting: a plan that
 * ran long is still a plan.
 */
export function computeDailyPortion(plan: KhatmahPlan, today: string = dayKey()): DailyPortion {
  const completed = Math.max(0, Math.min(plan.completedPages, TOTAL_PAGES));
  const pagesLeft = TOTAL_PAGES - completed;
  const percent = Math.round((completed / TOTAL_PAGES) * 100);

  const elapsed = Math.max(0, daysBetween(plan.startedOn, today));
  const day = elapsed + 1;

  if (pagesLeft === 0) {
    return {
      from: TOTAL_PAGES,
      to: TOTAL_PAGES,
      pages: 0,
      day,
      daysLeft: 0,
      pagesLeft: 0,
      percent: 100,
      finished: true,
      overdue: false,
    };
  }

  const overdue = day > plan.days;
  // Past the deadline the pace is held at the plan's original rate rather than
  // divided by a day that no longer exists.
  const daysLeft = overdue ? 1 : plan.days - elapsed;
  const perDay = overdue
    ? Math.ceil(TOTAL_PAGES / plan.days)
    : Math.ceil(pagesLeft / Math.max(daysLeft, 1));

  const from = completed + 1;
  const to = Math.min(TOTAL_PAGES, from + Math.max(perDay, 1) - 1);

  return {
    from,
    to,
    pages: to - from + 1,
    day,
    daysLeft: Math.max(daysLeft, 1),
    pagesLeft,
    percent,
    finished: false,
    overdue,
  };
}

/**
 * Records progress up to a page.
 *
 * Only ever moves forward, and marks the day met once the reader reaches the
 * end of the portion they were asked for.
 */
export function advancePlan(
  plan: KhatmahPlan,
  reachedPage: number,
  today: string = dayKey(),
): KhatmahPlan {
  const portion = computeDailyPortion(plan, today);
  const completed = Math.max(plan.completedPages, Math.min(reachedPage, TOTAL_PAGES));
  if (completed === plan.completedPages) return plan;

  const met = completed >= portion.to && !plan.metOn.includes(today);

  return {
    ...plan,
    completedPages: completed,
    metOn: met ? [...plan.metOn, today] : plan.metOn,
  };
}

/** Restores a plan from storage, rejecting anything it cannot trust. */
export function parsePlan(raw: unknown): KhatmahPlan | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const stored = raw as Record<string, unknown>;

  if (typeof stored.startedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(stored.startedOn)) {
    return null;
  }
  if (typeof stored.days !== 'number' || !Number.isFinite(stored.days)) return null;

  const completed =
    typeof stored.completedPages === 'number' && Number.isFinite(stored.completedPages)
      ? Math.max(0, Math.min(Math.round(stored.completedPages), TOTAL_PAGES))
      : 0;

  return {
    startedOn: stored.startedOn,
    days: Math.max(MIN_PLAN_DAYS, Math.min(Math.round(stored.days), MAX_PLAN_DAYS)),
    completedPages: completed,
    metOn: Array.isArray(stored.metOn)
      ? stored.metOn.filter((item): item is string => typeof item === 'string')
      : [],
  };
}
