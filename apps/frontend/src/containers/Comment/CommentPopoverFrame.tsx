import { clsx } from "clsx";
import { createPortal } from "react-dom";

import type { ScreenPoint } from "@/containers/Build/projection";
import {
  ZOOMER_OVERLAY_INTERACTIVE_CLASS,
  ZOOMER_OVERLAY_SCROLLABLE_CLASS,
} from "@/containers/Build/Zoomer";
import useViewportSize from "@/ui/useViewportSize";

import { getCardPlacement, VIEWPORT_MARGIN } from "./commentPlacement";

/**
 * Positioning shell for a comment prompt, thread or preview. Rendered in a
 * portal with `position: fixed` so it escapes the zoom pane's `overflow-hidden`
 * clipping, anchored at its point (given in viewport coordinates) plus a
 * per-popover pixel `offset`, on whichever side of the pin has room (see
 * {@link getCardPlacement}). Visual chrome is left to the children. Marked
 * interactive so the outside-click logic and build hotkeys treat it as part of
 * the overlay.
 */
export function CommentPopoverFrame(props: {
  /** Anchor point in viewport coordinates. */
  point: ScreenPoint;
  /**
   * Pixel offset from the anchor point, for a popover on the pin's right. On
   * the left side it is mirrored: the same gap from the pin's left edge.
   */
  offset?: { x: number; y: number };
  /** Width in pixels: picking a side needs it before the first paint. */
  width: number;
  className?: string;
  role?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  const { point, offset = { x: 12, y: 8 }, className, role } = props;
  const viewport = useViewportSize();
  const width = Math.min(props.width, viewport.width - 2 * VIEWPORT_MARGIN);
  const placement = getCardPlacement({
    point,
    offsetX: offset.x,
    width,
    viewportWidth: viewport.width,
  });
  return createPortal(
    <div
      role={role}
      aria-label={props["aria-label"]}
      style={{
        // With room on neither side (a narrow window, a phone), as far right
        // as it fits, over the pin.
        left: placement?.left ?? viewport.width - VIEWPORT_MARGIN - width,
        top: point.top,
        width,
        transform: `translateY(${offset.y}px)`,
      }}
      className={clsx(
        ZOOMER_OVERLAY_INTERACTIVE_CLASS,
        ZOOMER_OVERLAY_SCROLLABLE_CLASS,
        "fixed z-50",
        className,
      )}
    >
      {props.children}
    </div>,
    document.body,
  );
}
