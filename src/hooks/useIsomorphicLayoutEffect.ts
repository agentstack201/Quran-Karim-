import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * Avoids React's server-rendering warning while keeping synchronous, pre-paint
 * behaviour where it matters (theme application, scroll restoration).
 */
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;
