'use client';

import { useSyncExternalStore } from 'react';

/** A store that never changes — the snapshot alone carries the information. */
const subscribe = (): (() => void) => () => {};
const getSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

/**
 * True once the component is running in the browser.
 *
 * Used to gate portals, which need a real `document.body`. Implemented with
 * `useSyncExternalStore` rather than the older `useState` + `useEffect` dance:
 * React treats the server and client snapshots as distinct by design, so there
 * is no hydration mismatch and no cascading render after mount.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
