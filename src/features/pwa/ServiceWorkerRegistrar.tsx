'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker.
 *
 * Registration is deferred until after `load` so it never competes with the
 * first render for bandwidth or main-thread time — the worker's only job on a
 * first visit is to prepare for the *second* one.
 *
 * A waiting worker is activated immediately rather than being announced with an
 * "update available" prompt: the shell is small, the content is immutable, and
 * an unexpected reload mid-recitation would be far more disruptive than a
 * silent swap that takes effect on the next navigation.
 */
export function ServiceWorkerRegistrar(): null {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // A worker registered from a dev server would cache development bundles.
    if (process.env.NODE_ENV !== 'production') return;

    let cancelled = false;

    const register = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (cancelled) return;

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener('statechange', () => {
            // `controller` is null on the very first install, where there is
            // nothing to replace and nothing to tell the user about.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      } catch (error) {
        // A failed registration costs offline support, nothing more — the app
        // itself keeps working, so this stays a warning.
        console.warn('[tilawa] Service worker registration failed', error);
      }
    };

    if (document.readyState === 'complete') {
      void register();
      return () => {
        cancelled = true;
      };
    }

    const onLoad = (): void => void register();
    window.addEventListener('load', onLoad);

    return () => {
      cancelled = true;
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return null;
}
