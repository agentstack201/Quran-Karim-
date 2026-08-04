'use client';

import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

/** Number of components currently requesting a scroll lock. */
let lockCount = 0;
let restoreOverflow = '';
let restorePaddingInline = '';

/**
 * Prevents the page behind a dialog from scrolling.
 *
 * Reference-counted, so nested overlays (a settings sheet opened above a tafsir
 * dialog) do not release the lock too early. The scrollbar width is compensated
 * with padding to stop the layout shifting sideways as the bar disappears.
 */
export function useLockBodyScroll(active: boolean): void {
  useIsomorphicLayoutEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      const { body } = document;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      restoreOverflow = body.style.overflow;
      restorePaddingInline = body.style.paddingInlineEnd;

      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        const current = Number.parseFloat(getComputedStyle(body).paddingInlineEnd) || 0;
        body.style.paddingInlineEnd = `${current + scrollbarWidth}px`;
      }
    }

    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = restoreOverflow;
        document.body.style.paddingInlineEnd = restorePaddingInline;
      }
    };
  }, [active]);
}
