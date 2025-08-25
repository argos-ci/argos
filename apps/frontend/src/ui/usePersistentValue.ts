import { useLayoutEffect, useRef } from "react";

/**
 * A custom hook that returns a persistent value.
 * It keeps the truthy value across renders.
 * @param value The value to persist.
 * @returns The persistent value.
 */
export function usePersistentValue<T>(value: T): T {
  const ref = useRef<T>(value);
  useLayoutEffect(() => {
    if (value) {
      ref.current = value;
    }
  }, [value]);
  return value ?? ref.current;
}
