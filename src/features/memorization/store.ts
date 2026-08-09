import { STORAGE_KEYS } from '@/constants';
import { readStorage, writeStorage } from '@/services/storage';
import { deserialise, serialise, type MemoryUnit, type MemoryUnitKey } from './model';

/**
 * The ḥifẓ history, as an external store.
 * -----------------------------------------------------------------------------
 * Modelled for `useSyncExternalStore` rather than `useState` + `useEffect`,
 * for three reasons that all bite this particular state:
 *
 *   • **Hydration.** The server has no LocalStorage, so the first client render
 *     must match the server's empty one and only then swap. React does this
 *     natively through the two-snapshot contract; the effect version fakes it
 *     with a `hydrated` flag and a cascading render.
 *   • **Cross-tab.** An installed PWA open twice must not have one window
 *     silently overwrite the other's reviews. A store with subscribers gets
 *     this for free.
 *   • **Serialisation.** A `Map` does not survive `JSON.stringify` — it becomes
 *     `{}`. Keeping the compact snapshot conversion inside the store means no
 *     caller can accidentally persist an empty object over a year of ḥifẓ.
 */

const EMPTY: ReadonlyMap<MemoryUnitKey, MemoryUnit> = new Map();

/**
 * The parsed snapshot, cached.
 *
 * `useSyncExternalStore` calls `getSnapshot` on every render and bails out only
 * when the result is referentially equal to the last one. Parsing afresh each
 * time would return a new `Map` every render and spin forever, so the cache is
 * not an optimisation — it is what makes the hook terminate.
 */
let cache: ReadonlyMap<MemoryUnitKey, MemoryUnit> = EMPTY;

/** The raw string the cache was parsed from, used to detect outside changes. */
let cachedRaw: string | null | undefined;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function readRaw(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.memorization);
  } catch {
    // Safari in private mode, or site data disabled entirely.
    return null;
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Another tab writing the same key. The event does not fire in the tab that
  // performed the write, which is why `save` notifies directly.
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEYS.memorization) return;
    listener();
  };

  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function getSnapshot(): ReadonlyMap<MemoryUnitKey, MemoryUnit> {
  const raw = readRaw();
  if (raw === cachedRaw) return cache;

  cachedRaw = raw;
  cache = readStorage(STORAGE_KEYS.memorization, deserialise) ?? EMPTY;
  return cache;
}

/** The server knows nothing about any reader, and must not pretend otherwise. */
export function getServerSnapshot(): ReadonlyMap<MemoryUnitKey, MemoryUnit> {
  return EMPTY;
}

/**
 * Applies a change and persists it.
 *
 * The cache is updated before the write so a failed write — a full quota, most
 * likely — still leaves the session working with the new state in memory. The
 * reader loses persistence, not their afternoon's reviews.
 */
export function save(
  change: (current: Map<MemoryUnitKey, MemoryUnit>) => Map<MemoryUnitKey, MemoryUnit>,
): void {
  const next = change(new Map(getSnapshot()));
  const snapshot = serialise(next);

  cache = next;
  cachedRaw = JSON.stringify(snapshot);

  writeStorage(STORAGE_KEYS.memorization, snapshot);
  notify();
}
