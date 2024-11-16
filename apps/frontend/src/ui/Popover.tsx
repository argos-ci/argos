import { forwardRef } from "react";
import { clsx } from "clsx";
import {
  PopoverProps,
  PopoverRenderProps,
  Popover as RACPopover,
} from "react-aria-components";

function getPopoverAnimationClassName(values: PopoverRenderProps): string {
  return clsx(
    "fill-mode-forwards",
    {
      bottom: "origin-top",
      top: "origin-bottom",
      left: "origin-right",
      right: "origin-left",
      center: "origin-center",
    }[values.placement],
    values.isEntering && "animate-in fade-in",
    values.isExiting && "animate-out fade-out zoom-out-95",
  );
}

export const Popover = forwardRef(function Popover(
  { className, ...props }: PopoverProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <RACPopover
      ref={ref}
      offset={4}
      className={(values) =>
        clsx(
          "bg-subtle z-50 flex rounded-lg border bg-clip-padding p-1",
          getPopoverAnimationClassName(values),
          className,
        )
      }
      {...props}
    />
  );
});
