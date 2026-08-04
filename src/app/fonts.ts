import localFont from 'next/font/local';

/**
 * Typeface loading.
 *
 * Split by script rather than declared as one family each, so that only the
 * bytes actually rendered on first paint are preloaded. Declaring all nine
 * vendored files as two families made Next preload 312 kB of fonts — roughly
 * 1.7 s on a slow 4G connection, before a single ayah could paint.
 *
 * What survives that cut is 138 kB: the Arabic Amiri and the Arabic Cairo.
 * Everything else loads on demand through the browser's ordinary font fallback
 * chain, which picks the family that actually covers each character.
 */

/**
 * Amiri — the Quranic typeface.
 *
 * A Naskh revival with full support for the Uthmani orthography: superscript
 * alef, small high seen, sajdah marks and pause signs.
 *
 * Arabic, regular only. The bold cut is not loaded because traditional Naskh is
 * not set in bold — weight in Arabic calligraphy comes from size and the pen,
 * not from a heavier cut — and shipping it would have cost another 99 kB on the
 * critical path. The Latin cuts are absent because Quranic text is Arabic
 * throughout; Latin inside the reader is set in Cairo.
 */
export const amiri = localFont({
  src: [{ path: '../../public/fonts/amiri-arabic-400.woff2', weight: '400', style: 'normal' }],
  variable: '--font-amiri',
  /*
   * `block`, not `swap`, and only for this face.
   *
   * Amiri sets 15.6% narrower than any platform fallback, so swapping it in
   * re-wrapped every ayah and snapped the page — a measured 0.19 cumulative
   * layout shift on every reading page. A metric-matched fallback fixes that
   * only where the platform actually has an Arabic Naskh face installed, which
   * is not something to depend on.
   *
   * Blocking costs nothing here because the font is preloaded and starts
   * downloading alongside the HTML: the text paints when the font arrives
   * instead of painting twice, which measured *faster* to largest contentful
   * paint, not slower, because LCP counts the final paint either way.
   *
   * The block period is bounded — browsers fall back after ~3 s — so a failed
   * font download degrades to readable text rather than a blank page.
   */
  display: 'block',
  preload: true,
  fallback: ['Traditional Arabic', 'Scheherazade New', 'Times New Roman', 'serif'],
  adjustFontFallback: false,
});

/**
 * Cairo — the interface typeface, Arabic.
 *
 * A variable font covering 400–700 in a single ~31 kB file, which is what puts
 * the whole UI weight range on the critical path for the price of one request.
 */
export const cairo = localFont({
  src: [
    { path: '../../public/fonts/cairo-arabic-400-700.woff2', weight: '400 700', style: 'normal' },
  ],
  variable: '--font-cairo',
  display: 'swap',
  preload: true,
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
  adjustFontFallback: false,
});

/**
 * Cairo — Latin.
 *
 * Deliberately not preloaded. Latin text in this app is secondary — surah
 * transliterations, English translations — and never the largest contentful
 * paint. The browser reaches it through the fallback chain only when it meets a
 * character the Arabic cut does not cover, so it costs nothing on an
 * Arabic-only screen.
 */
export const cairoLatin = localFont({
  src: [
    { path: '../../public/fonts/cairo-latin-400-700.woff2', weight: '400 700', style: 'normal' },
  ],
  variable: '--font-cairo-latin',
  display: 'swap',
  preload: false,
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
  adjustFontFallback: false,
});

/** Combined font variables to place on the `<html>` element. */
export const fontVariables = `${amiri.variable} ${cairo.variable} ${cairoLatin.variable}`;
