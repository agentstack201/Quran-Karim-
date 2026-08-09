import { toArabicNumerals } from './arabic';

/** Formats an integer with Arabic-Indic digits and Arabic thousands grouping. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value);
}

/** Formats a count with its Arabic noun, respecting dual and plural forms. */
export function pluralise(
  count: number,
  forms: { one: string; two: string; few: string; many: string },
): string {
  if (count === 1) return forms.one;
  if (count === 2) return forms.two;
  if (count % 100 >= 3 && count % 100 <= 10) return forms.few;
  return forms.many;
}

/**
 * Formats a byte count for a reader deciding whether to spend it.
 *
 * Binary units, because that is what a phone's storage settings report and a
 * reader comparing the two numbers should not find them disagreeing. One
 * decimal below a gigabyte and two above it: the difference between 1.2 GB and
 * 1.25 GB matters when a device has 4 GB left.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '٠ ب';

  const units = ['ب', 'ك.ب', 'م.ب', 'ج.ب'] as const;
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const decimals = unit === 0 ? 0 : unit === units.length - 1 ? 2 : 1;

  // Formatted through Intl rather than `toArabicNumerals`, which passes an
  // ASCII period through untouched. Arabic writes its decimals with U+066B, and
  // this has to match `formatNumber` — two number formats disagreeing about the
  // separator on the same screen reads as a bug.
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(value);

  return `${formatted} ${units[unit]}`;
}

/** Formats seconds as `m:ss`, using Arabic-Indic digits. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '٠:٠٠';
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor(totalSeconds / 60);
  return `${toArabicNumerals(minutes)}:${toArabicNumerals(String(seconds).padStart(2, '0'))}`;
}

/**
 * Formats a timestamp as a relative phrase ("منذ ٣ أيام"), falling back to an
 * absolute date beyond a month.
 */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const elapsed = now - timestamp;
  if (!Number.isFinite(elapsed)) return '';

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) return 'الآن';

  const formatter = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

  if (elapsed < hour) return formatter.format(-Math.floor(elapsed / minute), 'minute');
  if (elapsed < day) return formatter.format(-Math.floor(elapsed / hour), 'hour');
  if (elapsed < 30 * day) return formatter.format(-Math.floor(elapsed / day), 'day');

  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(timestamp);
}

/** Formats a date as a full Arabic date, e.g. "٤ أغسطس ٢٠٢٦". */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('ar', { dateStyle: 'long' }).format(timestamp);
}

/** Clamps a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Rounds to a fixed number of decimals without floating-point drift. */
export function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
