export type {
  Chapter,
  ChapterWithVerses,
  Hizb,
  Juz,
  ReadingMode,
  Reciter,
  RevelationPlace,
  SearchResponse,
  SearchResult,
  Tafsir,
  TafsirEdition,
  Verse,
  VerseRange,
  VerseRef,
} from './quran';

export type {
  BackgroundChoice,
  Bookmark,
  LastRead,
  MemorizationMask,
  ReadingStats,
  ResolvedTheme,
  Settings,
  Surface,
  ThemePreference,
} from './settings';

/** Lifecycle of any asynchronous resource in the UI. */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * A discriminated result type used by services so callers are forced to handle
 * failure. Services never throw across a boundary — they return this.
 */
export type Result<T, E = string> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: E };
