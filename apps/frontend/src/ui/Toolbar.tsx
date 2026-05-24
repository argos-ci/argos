import type { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";
import { Button as RACButton } from "react-aria-components";

export function ToolbarMenuButton(
  props: ComponentPropsWithRef<typeof RACButton>,
) {
  return (
    <RACButton
      {...props}
      className={clsx(
        "data-hovered:border-hover text-low data-hovered:text-default data-focus-visible:ring-default data-pressed:bg-active data-pressed:text-default aria-pressed:bg-active aria-pressed:text-default aria-expanded:bg-active aria-expanded:text-default",
        "border border-transparent",
        "focus:outline-hidden data-focus-visible:ring-4",
        "flex h-6 cursor-default items-center gap-0.5 rounded-md px-1.5 text-sm font-medium",
        props.className,
      )}
    />
  );
}
