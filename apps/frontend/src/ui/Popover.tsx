import { clsx } from "clsx";
import {
  PopoverProps,
  PopoverRenderProps,
  Popover as RACPopover,
} from "react-aria-components";

/**
 * Which way the popover moves on the way in and out: towards the viewer, from
 * the edge that touches its trigger.
 *
 * A translate rather than a scale. Scaling the whole box moves both of its
 * edges, and on a menu wider than its trigger that reads as the popover
 * stretching itself out to fit its longest row — an animation about the menu's
 * own layout rather than about where it came from. Sliding it keeps the box the
 * size it will settle at from the very first frame.
 *
 * Keyed on the *resolved* side, so a popover flipped for want of room animates
 * from the edge it actually opened against.
 */
const POPOVER_SLIDE_CLASS_NAMES: Record<
  NonNullable<PopoverRenderProps["placement"]>,
  { in: string; out: string }
> = {
  bottom: { in: "slide-in-from-top-1", out: "slide-out-to-top-1" },
  top: { in: "slide-in-from-bottom-1", out: "slide-out-to-bottom-1" },
  left: { in: "slide-in-from-right-1", out: "slide-out-to-right-1" },
  right: { in: "slide-in-from-left-1", out: "slide-out-to-left-1" },
  center: { in: "", out: "" },
};

function getPopoverAnimationClassName(values: PopoverRenderProps): string {
  const slide = values.placement
    ? POPOVER_SLIDE_CLASS_NAMES[values.placement]
    : null;
  return clsx(
    "fill-mode-forwards",
    values.isEntering && clsx("animate-in fade-in", slide?.in),
    values.isExiting && clsx("animate-out fade-out", slide?.out),
  );
}

export function Popover(
  props: PopoverProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACPopover
      offset={4}
      {...props}
      className={(values) =>
        clsx(
          "bg-app shadow-menu border-thin z-50 flex rounded-xl bg-clip-padding",
          getPopoverAnimationClassName(values),
          props.className,
        )
      }
    />
  );
}
