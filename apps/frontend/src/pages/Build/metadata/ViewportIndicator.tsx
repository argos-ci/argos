import { clsx } from "clsx";
import { AppWindow } from "lucide-react";

import { Chip, ChipProps } from "@/ui/Chip";

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
    <Chip
      icon={AppWindow}
      scale="xs"
      className={clsx("font-mono", className)}
      {...props}
    >
      {viewport.width}x{viewport.height}
    </Chip>
  );
}
