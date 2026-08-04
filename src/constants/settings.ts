import type { Settings } from '@/types';
import { DEFAULT_RECITER_ID } from './reciters';
import { DEFAULT_TAFSIR_ID } from './tafsirs';

/** LocalStorage keys, namespaced so they never collide with another app. */
export const STORAGE_KEYS = {
  settings: 'tilawa:settings',
  lastRead: 'tilawa:last-read',
  bookmarks: 'tilawa:bookmarks',
  visitedSurahs: 'tilawa:visited-surahs',
  readingDays: 'tilawa:reading-days',
  installPromptDismissed: 'tilawa:install-dismissed',
} as const;

/** Bumped whenever the persisted shape changes incompatibly. */
export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  surface: 'paper',
  quranScale: 1,
  quranLeading: 2.15,
  showTranslation: false,
  showTransliteration: false,
  reciterId: DEFAULT_RECITER_ID,
  tafsirId: DEFAULT_TAFSIR_ID,
  continuousPlayback: true,
  autoScroll: true,
  playbackRate: 1,
  volume: 1,
};

/** Bounds for the Quranic text scale control. */
export const QURAN_SCALE = {
  min: 0.75,
  max: 2,
  step: 0.125,
  default: 1,
} as const;

/** Bounds for the Quranic line-height control. */
export const QURAN_LEADING = {
  min: 1.6,
  max: 3,
  step: 0.15,
  default: 2.15,
} as const;

/** Maximum number of bookmarks retained; the oldest are dropped beyond this. */
export const MAX_BOOKMARKS = 500;

/** How many search results a single response may contain. */
export const SEARCH_RESULT_LIMIT = 50;

/** Minimum query length before a search is issued. */
export const SEARCH_MIN_LENGTH = 2;

/** Debounce applied to search-as-you-type, in milliseconds. */
export const SEARCH_DEBOUNCE_MS = 220;
