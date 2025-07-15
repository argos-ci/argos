import * as React from "react";

/**
 * A custom hook that returns the latest truthy value.
 * It keeps the latest truthy value across renders.
 * @param value The value to persist.
 * @returns The latest truthy value.
 */
export function useLatestTruethyValue<T>(value: T): T {
  const ref = React.useRef<T>(value);
  React.useLayoutEffect(() => {
    if (value) {
      ref.current = value;
    }
  }, [value]);
  return value ?? ref.current;
}
