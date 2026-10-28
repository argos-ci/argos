import type { ScreenPoint } from "@/containers/Build/projection";

/** Pin badge size: a size-7 (28px) avatar with 4px (`p-1`) padding all around. */
export const PIN_SIZE = 36;

/** Closest a card beside a pin comes to the viewport's left and right edges. */
export const VIEWPORT_MARGIN = 8;

/**
 * Which side of its pin a card goes on: the hover preview, the thread, the
 * composer. They are portaled out of the zoom pane's clipping, so nothing else
 * keeps them inside the window.
 *
 * On the pin's right, its left edge `offsetX` from the pin's tip, unless it
 * would run past the viewport there: then mirrored on the pin's left, its right
 * edge as far from the pin's right edge. Null when it fits on neither side.
 */
export function getCardPlacement(params: {
  /** The pin's tip (its bottom-left corner), in viewport coordinates. */
  point: ScreenPoint;
  offsetX: number;
  width: number;
  viewportWidth: number;
}): { side: "right" | "left"; left: number } | null {
  const { point, offsetX, width, viewportWidth } = params;
  const right = point.left + offsetX;
  if (right + width <= viewportWidth - VIEWPORT_MARGIN) {
    return { side: "right", left: right };
  }
  const left = point.left + PIN_SIZE - offsetX - width;
  if (left >= VIEWPORT_MARGIN) {
    return { side: "left", left };
  }
  return null;
}
