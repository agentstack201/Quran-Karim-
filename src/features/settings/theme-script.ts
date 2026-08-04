import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/constants';

/**
 * The theme bootstrap.
 *
 * This runs as a blocking inline script in `<head>`, before the browser paints
 * anything. It reads the persisted settings and stamps `data-theme`,
 * `data-surface` and the reader's typography custom properties onto `<html>`.
 *
 * Doing this in React instead would mean the first paint uses the default
 * theme and then snaps to the user's — the "flash of wrong theme" that makes an
 * app feel cheap. It is the single inline script in the application, and it is
 * generated from the same constants the runtime uses so the two cannot drift.
 *
 * It is written defensively: any failure leaves the document on the light
 * default rather than throwing before the app has a chance to load.
 */
export function buildThemeScript(): string {
  const source = `
(function () {
  try {
    var root = document.documentElement;
    var raw = null;
    try { raw = localStorage.getItem('__SETTINGS_KEY__'); } catch (e) { raw = null; }

    var settings = raw ? JSON.parse(raw) : null;
    if (!settings || typeof settings !== 'object') settings = {};

    var theme = settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system'
      ? settings.theme
      : '__DEFAULT_THEME__';

    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

    var surface = settings.surface === 'paper' || settings.surface === 'beige' || settings.surface === 'white'
      ? settings.surface
      : '__DEFAULT_SURFACE__';

    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-surface', surface);
    root.style.colorScheme = resolved;

    var scale = Number(settings.quranScale);
    if (isFinite(scale) && scale >= 0.75 && scale <= 2) {
      root.style.setProperty('--quran-scale', String(scale));
    }

    var leading = Number(settings.quranLeading);
    if (isFinite(leading) && leading >= 1.6 && leading <= 3) {
      root.style.setProperty('--quran-leading', String(leading));
    }
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-surface', '__DEFAULT_SURFACE__');
  }
})();`;

  return source
    .replace('__SETTINGS_KEY__', STORAGE_KEYS.settings)
    .replaceAll('__DEFAULT_THEME__', DEFAULT_SETTINGS.theme)
    .replaceAll('__DEFAULT_SURFACE__', DEFAULT_SETTINGS.surface)
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}
