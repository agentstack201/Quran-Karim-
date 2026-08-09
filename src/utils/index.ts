export { cn } from './cn';
export type { ClassValue } from './cn';

export {
  containsArabic,
  excerpt,
  normaliseArabic,
  parseVerseReference,
  stripDiacritics,
  toArabicNumerals,
} from './arabic';

export {
  clamp,
  formatDate,
  formatBytes,
  formatDuration,
  formatNumber,
  formatRelativeTime,
  pluralise,
  round,
} from './format';

export { addDays, dayKey, daysBetween, isDayKey } from './day';
export type { DayKey } from './day';

export { canShare, copyToClipboard, formatAyahForSharing, shareContent } from './share';
export type { ShareOutcome } from './share';
