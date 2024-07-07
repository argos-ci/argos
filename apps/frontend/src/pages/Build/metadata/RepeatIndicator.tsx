import { RepeatIcon } from "lucide-react";

import { Chip, ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export function RepeatIndicator({
  repeat,
  isPlaywright,
  ...props
}: Omit<ChipProps, "ref"> & {
  repeat: number;
  isPlaywright: boolean;
}) {
  return (
    <Tooltip
      content={
        isPlaywright ? (
          <>
            Repeat number {repeat}. This mode is enabled by passing{" "}
            <code>--repeat-each</code> to the command line.
          </>
        ) : (
          `Repeat number ${repeat}`
        )
      }
    >
      <Chip
        icon={RepeatIcon}
        scale="xs"
        className="font-mono tabular-nums"
        {...props}
      >
        {repeat}
      </Chip>
    </Tooltip>
  );
}
