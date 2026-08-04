'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query.
 *
 * `useSyncExternalStore` is the right primitive here: `matchMedia` *is* an
 * external store, and using it means the value is correct on the very first
 * client render instead of arriving one render late through an effect. On the
 * server the snapshot is `false`, which React reconciles without a mismatch.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onStoreChange);
      return () => mediaQuery.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True when the user has asked for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** True on viewports below the `md` breakpoint. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 47.99rem)');
}

/** True when the OS is set to a dark colour scheme. */
export function usePrefersDark(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}
