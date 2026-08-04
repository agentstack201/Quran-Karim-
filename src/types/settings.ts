/**
 * User preference model.
 *
 * Everything here is persisted to LocalStorage and restored before first paint,
 * so the app never flashes the wrong theme or font size.
 */

/** The user's explicit theme choice. `system` follows the OS. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** The theme actually applied to the document. */
export type ResolvedTheme = 'light' | 'dark';

/** Reading surface, applied when the resolved theme is light. */
export type Surface = 'paper' | 'beige' | 'white';

/**
 * The four background choices presented in the UI. `dark` is not a light
 * surface — selecting it switches the theme instead, which keeps a single,
 * obvious control for "how should the page look".
 */
export type BackgroundChoice = Surface | 'dark';

/** Persisted user settings. */
export type Settings = {
  readonly theme: ThemePreference;
  readonly surface: Surface;
  /** Multiplier applied to the Quranic text size. */
  readonly quranScale: number;
  /** Line-height multiplier for the Quranic text. */
  readonly quranLeading: number;
  readonly showTranslation: boolean;
  readonly showTransliteration: boolean;
  /** Identifier of the selected reciter. */
  readonly reciterId: string;
  /** Identifier of the selected tafsir edition. */
  readonly tafsirId: number;
  /** Continue to the next surah when a recitation finishes. */
  readonly continuousPlayback: boolean;
  /** Keep the playing ayah centred in the viewport. */
  readonly autoScroll: boolean;
  readonly playbackRate: number;
  /** 0–1. */
  readonly volume: number;
};

/** A saved position in the Mus'haf. */
export type LastRead = {
  readonly surah: number;
  readonly ayah: number;
  readonly surahName: string;
  /** Epoch milliseconds. */
  readonly timestamp: number;
};

/** A bookmarked ayah. */
export type Bookmark = {
  readonly key: string;
  readonly surah: number;
  readonly ayah: number;
  readonly surahName: string;
  /** A short excerpt of the ayah, for the bookmarks list. */
  readonly excerpt: string;
  /** Epoch milliseconds. */
  readonly createdAt: number;
};

/** Aggregate reading statistics shown on the home page. */
export type ReadingStats = {
  readonly bookmarkCount: number;
  readonly versesRead: number;
  readonly surahsVisited: number;
  readonly streakDays: number;
};
