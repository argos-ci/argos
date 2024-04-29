import { RotateCcwIcon } from "lucide-react";

import { Chip, ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export function RetryIndicator({
  retry,
  retries,
  ...props
}: Omit<ChipProps, "ref"> & {
  retry: number;
  retries: number;
}) {
  return (
    <Tooltip
      content={`Attempt number ${retry + 1} out of a total of ${retries + 1}.`}
    >
      <Chip
        icon={RotateCcwIcon}
        scale="xs"
        className="font-mono tabular-nums"
        {...props}
      >
        {retry + 1}/{retries + 1}
      </Chip>
    </Tooltip>
  );
}
