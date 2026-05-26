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
    values.isEntering && "animate-in fade-in",
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
          "bg-subtle border-thin z-50 flex rounded-lg bg-clip-padding p-1 has-[>[role=dialog]]:p-0",
          getPopoverAnimationClassName(values),
          props.className,
        )
      }
    />
  );
}
