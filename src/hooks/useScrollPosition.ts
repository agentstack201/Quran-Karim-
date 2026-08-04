'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Reports whether the page has scrolled past `threshold` pixels.
 *
 * Scroll position is external state, so `useSyncExternalStore` is the right
 * primitive — it gives a correct value on the first client render with no
 * cascading re-render after mount.
 *
 * Notifications are coalesced into one per animation frame, so a fast flick
 * wakes React at most 60 times a second instead of once per scroll event — the
 * difference between a smooth sticky header and a janky one on a mid-range
 * phone. React compares the boolean snapshot itself, so frames where the
 * threshold has not been crossed cost nothing beyond the comparison.
 */
export function useScrolledPast(threshold = 24): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    let frame = 0;

    const onScroll = (): void => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        onStoreChange();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  const getSnapshot = useCallback(() => window.scrollY > threshold, [threshold]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Smoothly returns to the top, respecting the reduced-motion preference. */
export function scrollToTop(): void {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

/** Scrolls an element into a comfortable reading position. */
export function scrollIntoView(element: Element, block: ScrollLogicalPosition = 'center'): void {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block });
}
