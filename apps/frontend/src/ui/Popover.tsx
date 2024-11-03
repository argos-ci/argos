import { forwardRef } from "react";
import { clsx } from "clsx";
import {
  PopoverProps,
  PopoverRenderProps,
  Popover as RACPopover,
} from "react-aria-components";

const popoverStyles = (values: PopoverRenderProps) =>
  clsx(
    "bg-subtle z-50 bg-clip-padding border rounded-lg p-1 fill-mode-forwards flex",
    "data-[placement=bottom]:origin-top data-[placement=top]:origin-bottom data-[placement=left]:origin-right data-[placement=right]:origin-left",
    values.isEntering && "animate-in fade-in",
    values.isExiting && "animate-out fade-out zoom-out-95",
  );

export const Popover = forwardRef(function Popover(
  { className, ...props }: PopoverProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <RACPopover
      ref={ref}
      offset={4}
      className={(values) => clsx(popoverStyles(values), className)}
      {...props}
    />
  );
});
