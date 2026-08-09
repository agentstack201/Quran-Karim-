/**
 * Calendar-day arithmetic.
 *
 * Local, never UTC. A reader's day ends at their midnight, not at Greenwich's —
 * someone reviewing at 1 a.m. in Riyadh is doing tonight's session, and a
 * scheduler that disagreed would break their streak for being awake late.
 *
 * Days are the only unit of time the memorisation engine works in. Hours would
 * imply a precision that does not exist: nobody's recall degrades on a
 * particular hour, and pretending otherwise would produce a schedule that
 * shifts every time they open the app slightly earlier.
 */

/** A local date rendered as `YYYY-MM-DD`. */
export type DayKey = string;

/** Today's local date key, or that of a given date. */
export function dayKey(date: Date = new Date()): DayKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Whole days from one date key to another, by calendar day rather than hours.
 *
 * Parsed as local midnight on both ends, so a span that crosses a daylight
 * saving boundary still counts whole days rather than 23 or 25 hours' worth.
 */
export function daysBetween(from: DayKey, to: DayKey): number {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

/** The date key `days` after `from`. Negative values move backwards. */
export function addDays(from: DayKey, days: number): DayKey {
  const date = new Date(`${from}T00:00:00`);
  if (Number.isNaN(date.getTime())) return from;
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

/** True for a well-formed `YYYY-MM-DD` key that names a real date. */
export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  // Round-tripping rejects the dates that parse but do not exist — 2025-02-30
  // becomes 2025-03-02, which is not the day anybody meant.
  return !Number.isNaN(date.getTime()) && dayKey(date) === value;
}
