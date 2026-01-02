import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import { InfoIcon } from "lucide-react";

export function TooltipIndicator(
  props: ComponentPropsWithRef<typeof InfoIcon>,
) {
  return (
    <InfoIcon
      {...props}
      className={clsx(
        "text-low hover:text-default ml-[0.25em] inline size-[0.85em]",
        props.className,
      )}
    />
  );
}
