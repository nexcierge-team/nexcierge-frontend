"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * A function whose identity never changes but which always calls the
 * latest `fn` (the "event handler" pattern). Lets components pass handlers
 * like sendMessage / retry into memoized children without defeating
 * React.memo on every render. Only call the result from events / effects,
 * never during render.
 */
export function useStableCallback<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
