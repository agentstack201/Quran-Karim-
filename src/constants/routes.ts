/**
 * Every route in the application, defined once.
 *
 * Components link through these helpers rather than string literals, so a route
 * rename is a single-file change and typos become type errors.
 */
export const ROUTES = {
  home: '/',
  surahIndex: '/surah',
  surah: (id: number): string => `/surah/${id}`,
  /**
   * Deep link to a single ayah.
   *
   * Carries the ayah in both the query and the fragment on purpose: the query
   * is readable during render (so the reader can highlight the target without
   * an effect), while the fragment lets the browser restore scroll position
   * natively on a cold load.
   */
  surahAyah: (surah: number, ayah: number): string => `/surah/${surah}?ayah=${ayah}#ayah-${ayah}`,
  juzIndex: '/juz',
  juz: (id: number): string => `/juz/${id}`,
  hizbIndex: '/hizb',
  hizb: (id: number): string => `/hizb/${id}`,
  search: '/search',
  searchQuery: (query: string): string => `/search?q=${encodeURIComponent(query)}`,
  bookmarks: '/bookmarks',
  about: '/about',
  offline: '/offline',
} as const;

/** API endpoints served by our own route handlers. */
export const API_ROUTES = {
  search: '/api/search',
  tafsir: (verseKey: string, tafsirId: number): string =>
    `/api/tafsir/${encodeURIComponent(verseKey)}?edition=${tafsirId}`,
  surah: (id: number): string => `/data/surah/${id}.json`,
  juz: (id: number): string => `/data/juz/${id}.json`,
} as const;

/** Primary navigation, rendered in the header and the mobile drawer. */
export const NAV_ITEMS = [
  { href: ROUTES.home, label: 'الرئيسية', icon: 'home' },
  { href: ROUTES.surahIndex, label: 'السور', icon: 'book' },
  { href: ROUTES.juzIndex, label: 'الأجزاء', icon: 'layers' },
  { href: ROUTES.hizbIndex, label: 'الأحزاب', icon: 'grid' },
  { href: ROUTES.bookmarks, label: 'المحفوظات', icon: 'bookmark' },
] as const;
