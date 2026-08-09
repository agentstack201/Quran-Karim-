'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import {
  DEFAULT_SETTINGS,
  QURAN_LEADING,
  QURAN_SCALE,
  STORAGE_KEYS,
  getReciter,
  getTafsirEdition,
} from '@/constants';
import { MAX_REPEAT_EACH, MAX_REPEAT_RANGE } from '@/features/audio/queue';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePrefersDark } from '@/hooks/useMediaQuery';
import type { BackgroundChoice, ResolvedTheme, Settings, Surface, ThemePreference } from '@/types';
import { clamp, round } from '@/utils';

type SettingsContextValue = {
  readonly settings: Settings;
  /** True once the persisted values have been read. */
  readonly hydrated: boolean;
  /** The theme actually applied, with `system` already resolved. */
  readonly resolvedTheme: ResolvedTheme;
  readonly update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  readonly setTheme: (theme: ThemePreference) => void;
  readonly toggleTheme: () => void;
  /** Applies one of the four background choices from the settings panel. */
  readonly setBackground: (choice: BackgroundChoice) => void;
  /** The background chip currently reflected in the UI. */
  readonly background: BackgroundChoice;
  readonly increaseFont: () => void;
  readonly decreaseFont: () => void;
  readonly resetFont: () => void;
  readonly resetAll: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Validates settings restored from LocalStorage.
 *
 * Anything unrecognised falls back to its default rather than being trusted:
 * the stored blob may have been written by an older version of the app, edited
 * by hand, or corrupted. A reader must never be bricked by a bad preference.
 */
function parseSettings(raw: unknown): Settings | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const stored = raw as Record<string, unknown>;

  const theme: ThemePreference =
    stored.theme === 'light' || stored.theme === 'dark' || stored.theme === 'system'
      ? stored.theme
      : DEFAULT_SETTINGS.theme;

  const surface: Surface =
    stored.surface === 'paper' || stored.surface === 'beige' || stored.surface === 'white'
      ? stored.surface
      : DEFAULT_SETTINGS.surface;

  const numberOr = (value: unknown, fallback: number, min: number, max: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;

  const booleanOr = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback;

  return {
    theme,
    surface,
    quranScale: numberOr(
      stored.quranScale,
      DEFAULT_SETTINGS.quranScale,
      QURAN_SCALE.min,
      QURAN_SCALE.max,
    ),
    quranLeading: numberOr(
      stored.quranLeading,
      DEFAULT_SETTINGS.quranLeading,
      QURAN_LEADING.min,
      QURAN_LEADING.max,
    ),
    showTranslation: booleanOr(stored.showTranslation, DEFAULT_SETTINGS.showTranslation),
    showTransliteration: booleanOr(
      stored.showTransliteration,
      DEFAULT_SETTINGS.showTransliteration,
    ),
    // Resolving through the lookup helpers guarantees a valid id even if the
    // stored reciter or tafsir has since been removed from the catalogue.
    reciterId: getReciter(typeof stored.reciterId === 'string' ? stored.reciterId : '').id,
    tafsirId: getTafsirEdition(typeof stored.tafsirId === 'number' ? stored.tafsirId : 0).id,
    continuousPlayback: booleanOr(stored.continuousPlayback, DEFAULT_SETTINGS.continuousPlayback),
    autoScroll: booleanOr(stored.autoScroll, DEFAULT_SETTINGS.autoScroll),
    playbackRate: numberOr(stored.playbackRate, DEFAULT_SETTINGS.playbackRate, 0.5, 2),
    volume: numberOr(stored.volume, DEFAULT_SETTINGS.volume, 0, 1),
    // Rounded as well as clamped: a fractional repeat count would silently
    // truncate later, and reading it back as a whole number keeps the control
    // and the stored value agreeing.
    repeatEach: Math.round(
      numberOr(stored.repeatEach, DEFAULT_SETTINGS.repeatEach, 1, MAX_REPEAT_EACH),
    ),
    repeatRange: Math.round(
      numberOr(stored.repeatRange, DEFAULT_SETTINGS.repeatRange, 1, MAX_REPEAT_RANGE),
    ),
    memorizationMask:
      stored.memorizationMask === 'firstWord' || stored.memorizationMask === 'hidden'
        ? stored.memorizationMask
        : DEFAULT_SETTINGS.memorizationMask,
  };
}

export function SettingsProvider({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const {
    value: settings,
    setValue: setSettings,
    hydrated,
  } = useLocalStorage<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS, parseSettings);

  // Subscribed rather than sampled, so `theme: 'system'` follows the OS live —
  // including when the user flips their system appearance while reading.
  const systemPrefersDark = usePrefersDark();

  const resolvedTheme: ResolvedTheme =
    settings.theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : settings.theme;

  /**
   * Mirror settings onto the document. The bootstrap script already did this
   * for the initial paint; this keeps it in sync with every later change.
   */
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-surface', settings.surface);
    root.style.colorScheme = resolvedTheme;
    root.style.setProperty('--quran-scale', String(settings.quranScale));
    root.style.setProperty('--quran-leading', String(settings.quranLeading));
  }, [hydrated, resolvedTheme, settings.surface, settings.quranScale, settings.quranLeading]);

  // Keep the browser UI (address bar, status bar) matching the active theme.
  useEffect(() => {
    if (!hydrated) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const styles = getComputedStyle(document.documentElement);
    const background = styles.getPropertyValue('--background').trim();
    if (background) meta.setAttribute('content', background);
  }, [hydrated, resolvedTheme, settings.surface]);

  const update = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
    },
    [setSettings],
  );

  const setTheme = useCallback(
    (theme: ThemePreference) => setSettings((current) => ({ ...current, theme })),
    [setSettings],
  );

  const toggleTheme = useCallback(() => {
    setSettings((current) => {
      const currentlyDark =
        current.theme === 'dark' ||
        (current.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      return { ...current, theme: currentlyDark ? 'light' : 'dark' };
    });
  }, [setSettings]);

  const background: BackgroundChoice = resolvedTheme === 'dark' ? 'dark' : settings.surface;

  const setBackground = useCallback(
    (choice: BackgroundChoice) => {
      setSettings((current) =>
        choice === 'dark'
          ? { ...current, theme: 'dark' }
          : { ...current, theme: 'light', surface: choice },
      );
    },
    [setSettings],
  );

  const stepFont = useCallback(
    (direction: 1 | -1) => {
      setSettings((current) => ({
        ...current,
        quranScale: round(
          clamp(
            current.quranScale + direction * QURAN_SCALE.step,
            QURAN_SCALE.min,
            QURAN_SCALE.max,
          ),
        ),
      }));
    },
    [setSettings],
  );

  const increaseFont = useCallback(() => stepFont(1), [stepFont]);
  const decreaseFont = useCallback(() => stepFont(-1), [stepFont]);

  const resetFont = useCallback(() => {
    setSettings((current) => ({
      ...current,
      quranScale: QURAN_SCALE.default,
      quranLeading: QURAN_LEADING.default,
    }));
  }, [setSettings]);

  const resetAll = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      hydrated,
      resolvedTheme,
      update,
      setTheme,
      toggleTheme,
      setBackground,
      background,
      increaseFont,
      decreaseFont,
      resetFont,
      resetAll,
    }),
    [
      settings,
      hydrated,
      resolvedTheme,
      update,
      setTheme,
      toggleTheme,
      setBackground,
      background,
      increaseFont,
      decreaseFont,
      resetFont,
      resetAll,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Access the user's settings. Must be called under a `SettingsProvider`. */
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
