/**
 * Core Quran domain model.
 *
 * These types mirror the generated datasets exactly. They are the single source
 * of truth for the shape of Quranic data across the application — services,
 * route handlers and components all speak this language.
 */

/** Where a surah was revealed. */
export type RevelationPlace = 'meccan' | 'medinan';

/** A surah (chapter) — metadata only, without its verses. */
export type Chapter = {
  /** 1–114 */
  readonly id: number;
  /** Arabic name with full vocalisation, e.g. "البَقَرَة". */
  readonly name: string;
  /** Arabic name without vocalisation, used for search and URLs. */
  readonly nameSimple: string;
  /** Latin transliteration, e.g. "Al-Baqarah". */
  readonly transliteration: string;
  /** English meaning, e.g. "The Cow". */
  readonly translation: string;
  readonly revelation: RevelationPlace;
  /** Chronological order of revelation (1–114). */
  readonly revelationOrder: number;
  readonly versesCount: number;
  readonly rukuCount: number;
  /** Global verse id (1–6236) of the first verse. */
  readonly firstVerseId: number;
  /** Global verse id (1–6236) of the last verse. */
  readonly lastVerseId: number;
  readonly startPage: number;
  readonly endPage: number;
  readonly startJuz: number;
  readonly endJuz: number;
  /** False only for Al-Fatihah (Basmalah is ayah 1) and At-Tawbah (absent). */
  readonly hasBasmalah: boolean;
};

/** A single ayah with its text, translation and structural position. */
export type Verse = {
  /** Global verse id, 1–6236. */
  readonly id: number;
  readonly surah: number;
  readonly ayah: number;
  /** Canonical reference, e.g. "2:255". */
  readonly key: string;
  /** Ayah number rendered in Arabic-Indic digits, e.g. "٢٥٥". */
  readonly numberInSurah: string;
  /** Uthmani text. */
  readonly text: string;
  readonly transliteration: string;
  readonly translation: string;
  readonly page: number;
  readonly juz: number;
  readonly hizb: number;
  readonly rubAlHizb: number;
  readonly ruku: number;
  readonly sajdah: boolean;
};

/** A surah together with all of its verses — the reader's unit of work. */
export type ChapterWithVerses = {
  readonly chapter: Chapter;
  readonly verses: readonly Verse[];
};

/** A surah:ayah coordinate. */
export type VerseRef = {
  readonly surah: number;
  readonly ayah: number;
};

/** One of the thirty parts of the Quran. */
export type Juz = {
  readonly id: number;
  readonly name: string;
  readonly firstVerseId: number;
  readonly lastVerseId: number;
  readonly versesCount: number;
  readonly start: VerseRef;
  readonly end: VerseRef;
  readonly startPage: number;
  readonly endPage: number;
  /** The two hizb numbers this juz contains. */
  readonly hizbs: readonly number[];
};

/** One of the sixty hizb (halves of a juz). */
export type Hizb = {
  readonly id: number;
  readonly name: string;
  readonly juz: number;
  readonly firstVerseId: number;
  readonly lastVerseId: number;
  readonly versesCount: number;
  readonly start: VerseRef;
  readonly end: VerseRef;
  readonly startPage: number;
  readonly endPage: number;
};

/**
 * One page of the standard Madani Mus'haf.
 *
 * Pages are how most memorisers actually think — "three pages today", not
 * "verses 12 to 34" — and every verse already carries the page it sits on, so
 * this index is a grouping of existing data rather than a new dataset.
 */
export type Page = {
  /** 1–604. */
  readonly id: number;
  readonly firstVerseId: number;
  readonly lastVerseId: number;
  readonly versesCount: number;
  readonly start: VerseRef;
  readonly end: VerseRef;
  /** Juz payloads this page can be read from; four pages straddle two. */
  readonly juz: readonly number[];
  /** Every surah appearing on the page, in order. */
  readonly surahs: readonly number[];
};

/** How the user is navigating the Mus'haf. */
export type ReadingMode = 'surah' | 'juz' | 'hizb' | 'page';

/** A contiguous span of verses presented as one reading unit. */
export type VerseRange = {
  readonly mode: ReadingMode;
  readonly id: number;
  readonly title: string;
  readonly subtitle: string;
  readonly verses: readonly Verse[];
  readonly firstVerseId: number;
  readonly lastVerseId: number;
};

/** A single search hit. */
export type SearchResult = {
  readonly verseId: number;
  readonly surah: number;
  readonly ayah: number;
  readonly key: string;
  /** Surah name in Arabic, for display. */
  readonly surahName: string;
  /** Uthmani text of the matching verse. */
  readonly text: string;
  readonly translation: string;
  /** Which field produced the match. */
  readonly matchedIn: 'arabic' | 'translation';
  /** Relevance score; higher is better. */
  readonly score: number;
};

/** Response envelope for the search route handler. */
export type SearchResponse = {
  readonly query: string;
  readonly total: number;
  readonly results: readonly SearchResult[];
  /** True when more matches exist than were returned. */
  readonly truncated: boolean;
};

/** Tafsir for a single ayah, resolved from the Quran.com API. */
export type Tafsir = {
  readonly verseKey: string;
  readonly resourceId: number;
  readonly resourceName: string;
  /** Plain text — all upstream HTML is stripped before it reaches the client. */
  readonly text: string;
  readonly languageName: string;
};

/** A reciter available in the audio player. */
export type Reciter = {
  readonly id: string;
  /** Arabic display name. */
  readonly name: string;
  /** Latin display name. */
  readonly nameLatin: string;
  /** Riwaya / recitation style, in Arabic. */
  readonly style: string;
  /** Path segment on the audio CDN. */
  readonly folder: string;
  /** Approximate bitrate label, shown as a data-usage hint. */
  readonly bitrate: string;
};

/** A tafsir edition offered in the UI. */
export type TafsirEdition = {
  readonly id: number;
  readonly name: string;
  readonly author: string;
  readonly language: 'ar' | 'en';
};
