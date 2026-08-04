'use client';

import { useEffect, type RefObject } from 'react';

/** Elements that can hold focus, in DOM order. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('inert') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      // `offsetParent` is null for anything display:none, which is the cheapest
      // reliable visibility test available synchronously.
      (element.offsetParent !== null || element.getClientRects().length > 0),
  );
}

/**
 * Confines keyboard focus to a container while it is active, and restores focus
 * to the previously focused element on exit — the two halves of an accessible
 * modal dialog (WCAG 2.2 · 2.4.3 Focus Order, 2.1.2 No Keyboard Trap).
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus inside on the next frame so the element has been laid out and
    // any entry animation has begun.
    const frame = requestAnimationFrame(() => {
      const focusable = getFocusable(container);
      const target = focusable[0] ?? container;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      // Only restore focus if it is still inside the container; the user may
      // have deliberately moved on before this effect tore down.
      if (previouslyFocused?.isConnected && container.contains(document.activeElement)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [ref, active]);
}
