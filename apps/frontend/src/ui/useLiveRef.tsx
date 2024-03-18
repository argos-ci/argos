import * as React from "react";

/**
 * Return a reference that always hold the value of the last render.
 */
export function useLiveRef<T>(value: T): React.MutableRefObject<T> {
  const ref = React.useRef(value);
  React.useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
