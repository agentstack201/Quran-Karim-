'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);
  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}

const getSnapshot = (): boolean => navigator.onLine;
/** Assume connectivity on the server — the optimistic default renders no banner. */
const getServerSnapshot = (): boolean => true;

/**
 * Tracks browser connectivity.
 *
 * `navigator.onLine` only reports whether a network interface exists, not
 * whether the internet is actually reachable, so this is used to *explain*
 * failures and enable offline affordances — never as a precondition for
 * attempting a request.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
