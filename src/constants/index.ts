export {
  APP_DESCRIPTION,
  APP_DIRECTION,
  APP_LOCALE,
  APP_NAME,
  APP_NAME_LATIN,
  APP_TAGLINE,
  APP_TAGLINE_EN,
  BASMALAH,
  DATA_ATTRIBUTION,
  ISTIADHAH,
  SADAQA,
  SITE_URL,
  TOTAL_CHAPTERS,
  TOTAL_HIZB,
  TOTAL_JUZ,
  TOTAL_PAGES,
  TOTAL_VERSES,
} from './app';

export {
  AUDIO_BASE_URL,
  DEFAULT_RECITER_ID,
  PLAYBACK_RATES,
  RECITERS,
  buildAyahAudioUrl,
  getReciter,
  getReciterByFolder,
} from './reciters';

export { DEFAULT_TAFSIR_ID, QURAN_API_BASE, TAFSIR_EDITIONS, getTafsirEdition } from './tafsirs';

export { DATA_ROUTES, NAV_ITEMS, ROUTES } from './routes';

export {
  DEFAULT_SETTINGS,
  MAX_BOOKMARKS,
  QURAN_LEADING,
  QURAN_SCALE,
  REPEAT_CHOICES,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_LENGTH,
  SEARCH_RESULT_LIMIT,
  SETTINGS_VERSION,
  STORAGE_KEYS,
} from './settings';

export { SHORTCUTS, SHORTCUT_GROUPS } from './shortcuts';
export type { Shortcut, ShortcutId } from './shortcuts';
