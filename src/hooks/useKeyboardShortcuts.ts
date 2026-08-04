'use client';

import { useEffect, useRef } from 'react';
import type { ShortcutId } from '@/constants';

export type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

/** True when the event originated in a field where the key is real input. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
}

/**
 * Maps keystrokes onto the application's shortcut actions.
 *
 * Three rules keep the shortcuts from getting in the user's way:
 *
 *  1. Nothing fires while focus is inside a text field — typing "b" in the
 *     search box must never toggle a bookmark.
 *  2. Nothing fires alongside a platform modifier, so browser and OS shortcuts
 *     keep working. The one exception is Ctrl/Cmd+K, which every modern app
 *     now reserves for search and users expect here too.
 *  3. Space is only intercepted when it would otherwise scroll the page, and
 *     only if a play/pause handler is actually registered.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true): void {
  // Held in a ref so callers can pass a fresh object literal each render
  // without re-binding the listener.
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      const current = handlersRef.current;

      // Ctrl/Cmd+K — the universal "open search" gesture.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        if (current.search) {
          event.preventDefault();
          current.search();
        }
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const run = (handler: (() => void) | undefined): void => {
        if (!handler) return;
        event.preventDefault();
        handler();
      };

      switch (event.key) {
        case '/':
          run(current.search);
          break;
        case ' ':
          run(current.playPause);
          break;
        // The document is RTL, so ArrowLeft advances and ArrowRight goes back.
        case 'ArrowLeft':
          run(current.nextAyah);
          break;
        case 'ArrowRight':
          run(current.previousAyah);
          break;
        case 'Home':
          run(current.top);
          break;
        case '+':
        case '=':
          run(current.fontIncrease);
          break;
        case '-':
        case '_':
          run(current.fontDecrease);
          break;
        case '0':
          run(current.fontReset);
          break;
        case '?':
        case '؟':
          run(current.help);
          break;
        default: {
          // Letter shortcuts, matched case-insensitively and in both scripts
          // so they work with an Arabic keyboard layout too.
          const key = event.key.toLowerCase();
          if (key === 't' || key === 'ا') run(current.toggleTheme);
          else if (key === 'b' || key === 'ل') run(current.bookmark);
          else if (key === 's' || key === 'س') run(current.settings);
          break;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
