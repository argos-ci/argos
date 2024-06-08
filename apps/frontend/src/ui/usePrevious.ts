import { useLayoutEffect, useRef } from "react";

/**
 * Returns the value of the previous render.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
