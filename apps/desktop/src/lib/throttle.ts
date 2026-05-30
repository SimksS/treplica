import { useCallback, useRef } from "react";

/** Stable callback invoked at most once per `intervalMs`. */
export function useThrottledCallback<T extends (...args: never[]) => void>(
  fn: T,
  intervalMs: number,
): T {
  const fnRef = useRef(fn);
  const lastRef = useRef(0);
  fnRef.current = fn;

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRef.current < intervalMs) return;
      lastRef.current = now;
      fnRef.current(...args);
    }) as T,
    [intervalMs],
  );
}
