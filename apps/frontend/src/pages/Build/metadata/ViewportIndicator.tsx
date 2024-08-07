import { clsx } from "clsx";
import { AppWindow } from "lucide-react";

import { Chip, ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export function ViewportIndicator({
  viewport,
  className,
  ...props
}: Omit<ChipProps, "ref"> & {
  viewport: {
    width: number;
    height: number;
  };
}) {
  return (
    <Tooltip
      content={`Viewport size of ${viewport.width}x${viewport.height}px`}
    >
      <Chip
        icon={AppWindow}
        scale="xs"
        className={clsx("font-mono", className)}
        {...props}
      >
        {viewport.width}x{viewport.height}
      </Chip>
    </Tooltip>
  );
}
