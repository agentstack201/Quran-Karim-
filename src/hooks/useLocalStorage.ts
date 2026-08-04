'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readStorage, writeStorage } from '@/services/storage';

/**
 * A `useState` that persists to LocalStorage.
 *
 * Reads happen after mount, never during render, so the server and the first
 * client render agree and React never reports a hydration mismatch. The
 * `hydrated` flag lets callers hold back UI that would otherwise flash the
 * default value.
 *
 * Writes from other tabs are picked up through the `storage` event, so an
 * installed PWA open in two windows stays consistent.
 */
export function useLocalStorage<T>(
  key: string,
  fallback: T,
  parse?: (raw: unknown) => T | null,
): {
  value: T;
  setValue: (next: T | ((current: T) => T)) => void;
  hydrated: boolean;
} {
  const [value, setStateValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  // Captured once, deliberately never reassigned: the parser and fallback
  // describe the *shape* of a key, not changing state. Holding them in refs
  // keeps the mount effect dependency-free, so passing an inline function can
  // never cause storage to be re-read on every render.
  const parseRef = useRef(parse);
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    const stored = readStorage<T>(key, parseRef.current);
    if (stored !== null) setStateValue(stored);
    setHydrated(true);

    const onStorage = (event: StorageEvent): void => {
      if (event.key !== key) return;
      const next = readStorage<T>(key, parseRef.current);
      setStateValue(next ?? fallbackRef.current);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      setStateValue((current) => {
        const resolved = typeof next === 'function' ? (next as (c: T) => T)(current) : next;
        writeStorage(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return { value, setValue, hydrated };
}
