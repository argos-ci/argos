import { clsx } from "clsx";
import { createPortal } from "react-dom";

import { ZOOMER_OVERLAY_INTERACTIVE_CLASS } from "@/containers/Build/Zoomer";

import type { ScreenPoint } from "./geometry";

/**
 * Positioning shell for a comment prompt, thread or preview. Rendered in a
 * portal with `position: fixed` so it escapes the zoom pane's `overflow-hidden`
 * clipping, anchored at its point (given in viewport coordinates) plus a
 * per-popover pixel `offset`. Visual chrome is left to the children. Marked
 * interactive so the outside-click logic and build hotkeys treat it as part of
 * the overlay.
 */
export function CommentPopoverFrame(props: {
  /** Anchor point in viewport coordinates. */
  point: ScreenPoint;
  /** Pixel offset from the anchor point. */
  offset?: { x: number; y: number };
  className?: string;
  role?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  const { point, offset = { x: 12, y: 8 }, className, role } = props;
  return createPortal(
    <div
      role={role}
      aria-label={props["aria-label"]}
      style={{
        left: point.left,
        top: point.top,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
      className={clsx(
        ZOOMER_OVERLAY_INTERACTIVE_CLASS,
        "fixed z-50",
        className,
      )}
    >
      {props.children}
    </div>,
    document.body,
  );
}
