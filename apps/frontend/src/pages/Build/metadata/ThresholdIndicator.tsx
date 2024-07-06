import { clsx } from "clsx";
import { TargetIcon } from "lucide-react";

import { Chip, ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export function ThresholdIndicator({
  threshold,
  className,
  ...props
}: Omit<ChipProps, "ref"> & {
  threshold: number;
}) {
  return (
    <Tooltip content={`Custom sensitivity of ${threshold * 100}%`}>
      <Chip
        icon={TargetIcon}
        scale="xs"
        className={clsx("font-mono", className)}
        {...props}
      >
        {threshold * 100}%
      </Chip>
    </Tooltip>
  );
}
