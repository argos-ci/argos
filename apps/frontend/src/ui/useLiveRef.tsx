import { useLayoutEffect, useRef } from "react";

/**
 * Return a reference that always hold the value of the last render.
 */
export function useLiveRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
