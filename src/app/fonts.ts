import localFont from 'next/font/local';

/**
 * Amiri — the Quranic typeface.
 *
 * Amiri is a Naskh revival with full support for the Uthmani orthography
 * (superscript alef, small high seen, sajdah marks, pause signs). It is loaded
 * with `swap` so the first paint is never blocked, and its metric overrides are
 * tuned against the Arabic system fallback to keep layout shift imperceptible.
 */
export const amiri = localFont({
  src: [
    { path: '../../public/fonts/amiri-arabic-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/amiri-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/amiri-arabic-700.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/amiri-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-amiri',
  display: 'swap',
  preload: true,
  fallback: ['Traditional Arabic', 'Scheherazade New', 'serif'],
  adjustFontFallback: false,
});

/**
 * Cairo — the interface typeface.
 *
 * A variable font (400–700) covering Arabic and Latin, which keeps the whole UI
 * weight range within a single ~30 kB Arabic subset.
 */
export const cairo = localFont({
  src: [
    { path: '../../public/fonts/cairo-arabic-400-700.woff2', weight: '400 700', style: 'normal' },
    { path: '../../public/fonts/cairo-latin-400-700.woff2', weight: '400 700', style: 'normal' },
  ],
  variable: '--font-cairo',
  display: 'swap',
  preload: true,
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
  adjustFontFallback: false,
});

/** Combined font variables to place on the `<html>` element. */
export const fontVariables = `${amiri.variable} ${cairo.variable}`;
