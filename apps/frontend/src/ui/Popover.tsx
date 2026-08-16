import { clsx } from "clsx";
import {
  PopoverProps,
  PopoverRenderProps,
  Popover as RACPopover,
} from "react-aria-components";

import { popupSurfaceClassName, popupZIndexClassName } from "./popupSurface";

/**
 * Where the pop-in animation grows from: the corner touching the trigger.
 *
 * The render values only carry the resolved *side* ("bottom"), not the
 * requested alignment — so an end-aligned menu used to zoom from its top
 * center, visibly detached from the button that opened it. The alignment is
 * read back from the `placement` prop, while the side comes from the render
 * values so a flipped popover still animates from the right edge.
 */
function getPopoverOriginClassName(
  side: PopoverRenderProps["placement"],
  requestedPlacement: PopoverProps["placement"],
): string | null {
  const alignment = requestedPlacement?.split(" ")[1];
  switch (side) {
    case "bottom":
      return {
        start: "origin-top-left",
        end: "origin-top-right",
        default: "origin-top",
      }[alignment ?? "default"]!;
    case "top":
      return {
        start: "origin-bottom-left",
        end: "origin-bottom-right",
        default: "origin-bottom",
      }[alignment ?? "default"]!;
    case "left":
      return "origin-right";
    case "right":
      return "origin-left";
    case "center":
      return "origin-center";
    default:
      return null;
  }
}

function getPopoverAnimationClassName(
  values: PopoverRenderProps,
  requestedPlacement: PopoverProps["placement"],
): string {
  return clsx(
    "fill-mode-forwards",
    getPopoverOriginClassName(values.placement, requestedPlacement),
    // Mirrors the exit: without the zoom the menu just fades in mid-air
    // instead of growing out of its trigger.
    values.isEntering && "animate-in fade-in zoom-in-95",
    values.isExiting && "animate-out fade-out zoom-out-95",
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
          popupSurfaceClassName,
          popupZIndexClassName,
          getPopoverAnimationClassName(values, props.placement),
          props.className,
        )
      }
    />
  );
}
