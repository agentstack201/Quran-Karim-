'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stayed unchanged for `delay` milliseconds.
 *
 * Used by search-as-you-type: the input stays perfectly responsive because it
 * is uncontrolled by the delay, while the request only fires once the user
 * pauses.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
