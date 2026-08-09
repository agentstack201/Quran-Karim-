'use client';

import { useEffect, useRef } from 'react';

/**
 * Grace period before a released lock is actually given up.
 *
 * Advancing to the next ayah swaps the element's `src`, and the media load
 * algorithm fires `pause` as it does — so playback reads as stopped for a few
 * milliseconds between every pair of verses. Without this delay, reciting a
 * long surah would request and drop a wake lock hundreds of times. Two seconds
 * is far longer than any transition and far shorter than any screen timeout.
 */
const RELEASE_GRACE_MS = 2000;

/**
 * Holds a screen wake lock while `active` is true.
 *
 * A reader following the text as it is recited loses their place every time the
 * phone dims, which on most devices is well under a minute — long recitations
 * were unusable without touching the screen. The lock is dropped shortly after
 * playback stops, so it never outlives the reason it was taken.
 *
 * Two behaviours the platform forces on us, both handled here:
 *
 *   - The browser revokes the lock whenever the page is hidden and does not
 *     restore it. Re-acquiring on `visibilitychange` is what lets the lock
 *     survive a reader glancing at another app mid-recitation.
 *   - `request()` rejects on an unsupported browser, a hidden page, or a device
 *     in low-power mode. None of those deserve an error — the screen simply
 *     dims the way it always did.
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    const release = (): void => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      void sentinel?.release().catch(() => {
        // Already revoked by the browser; there is nothing left to undo.
      });
    };

    if (!active) {
      releaseTimerRef.current = setTimeout(release, RELEASE_GRACE_MS);
      return;
    }

    clearTimeout(releaseTimerRef.current);

    // `request()` is async, so a pause landing mid-flight can resolve after
    // this effect has already been replaced. The flag keeps that orphan from
    // being installed as the live lock.
    let superseded = false;

    const acquire = async (): Promise<void> => {
      if (sentinelRef.current || document.visibilityState !== 'visible') return;

      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (superseded) {
          void sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Unsupported, blocked, or the battery is too low. Harmless.
      }
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') void acquire();
      // A hidden page has already lost the lock; drop our stale handle so the
      // next acquisition is not skipped as a no-op.
      else sentinelRef.current = null;
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      superseded = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [active]);

  // Unmount is the one moment the lock must go immediately, grace or not.
  useEffect(() => {
    const timerRef = releaseTimerRef;
    const sentinel = sentinelRef;
    return () => {
      clearTimeout(timerRef.current);
      void sentinel.current?.release().catch(() => {});
      sentinel.current = null;
    };
  }, []);
}
