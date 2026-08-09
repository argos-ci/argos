import { clsx } from "clsx";
import {
  PopoverProps,
  PopoverRenderProps,
  Popover as RACPopover,
} from "react-aria-components";

function getPopoverAnimationClassName(values: PopoverRenderProps): string {
  return clsx(
    "fill-mode-forwards",
    values.placement &&
      {
        bottom: "origin-top",
        top: "origin-bottom",
        left: "origin-right",
        right: "origin-left",
        center: "origin-center",
      }[values.placement],
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
          "bg-app shadow-menu border-thin z-50 flex rounded-xl bg-clip-padding",
          getPopoverAnimationClassName(values),
          props.className,
        )
      }
    />
  );
}
