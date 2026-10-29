import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type OffsetOptions,
  type Placement,
} from "@floating-ui/react-dom";
import { clsx } from "clsx";
import { createPortal } from "react-dom";

import type { ScreenPoint } from "@/containers/Build/projection";
import {
  ZOOMER_OVERLAY_INTERACTIVE_CLASS,
  ZOOMER_OVERLAY_SCROLLABLE_CLASS,
} from "@/containers/Build/Zoomer";

import { usePinReference, WINDOW_PADDING } from "./usePinReference";

/**
 * Positioning shell for a comment prompt or thread. Rendered in a portal with
 * `position: fixed` so it escapes the zoom pane's `overflow-hidden` clipping,
 * and placed beside its pin by floating-ui: on the `placement` side when there
 * is room, on the other side when not, and shifted inside the window when it
 * fits on neither (a phone). Visual chrome is left to the children. Marked
 * interactive so the outside-click logic and build hotkeys treat it as part of
 * the overlay.
 */
export function CommentPopoverFrame(props: {
  /** Anchor point (the pin's bottom-left tip) in viewport coordinates. */
  point: ScreenPoint;
  placement: Placement;
  offset: OffsetOptions;
  className?: string;
  role?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  const { point, placement, className, role } = props;
  const reference = usePinReference(point);
  const { refs, floatingStyles } = useFloating({
    strategy: "fixed",
    placement,
    elements: { reference },
    middleware: [
      offset(props.offset),
      // Sides only: a thread running past the bottom of the window is shifted
      // up by `shift`, rather than flipped to grow upward from the pin.
      flip({ crossAxis: false, padding: WINDOW_PADDING }),
      shift({ crossAxis: true, padding: WINDOW_PADDING }),
    ],
    whileElementsMounted: autoUpdate,
  });
  return createPortal(
    <div
      ref={refs.setFloating}
      role={role}
      aria-label={props["aria-label"]}
      style={floatingStyles}
      className={clsx(
        ZOOMER_OVERLAY_INTERACTIVE_CLASS,
        ZOOMER_OVERLAY_SCROLLABLE_CLASS,
        "z-50",
        className,
      )}
    >
      {props.children}
    </div>,
    document.body,
  );
}
