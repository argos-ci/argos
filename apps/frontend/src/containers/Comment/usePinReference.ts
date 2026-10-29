import { useMemo } from "react";
import type { VirtualElement } from "@floating-ui/react-dom";

import type { ScreenPoint } from "@/containers/Build/projection";

/** Pin badge size: a size-7 (28px) avatar with 4px (`p-1`) padding all around. */
export const PIN_SIZE = 36;

/** Closest a card beside a pin comes to the window's edges. */
export const WINDOW_PADDING = 8;

/**
 * The pin, as the reference floating-ui places its cards against: the
 * `PIN_SIZE` square whose bottom-left corner (the tip) is on the point.
 */
export function usePinReference(point: ScreenPoint): VirtualElement {
  const { left, top } = point;
  return useMemo(
    () => ({
      getBoundingClientRect: () =>
        new DOMRect(left, top - PIN_SIZE, PIN_SIZE, PIN_SIZE),
    }),
    [left, top],
  );
}
