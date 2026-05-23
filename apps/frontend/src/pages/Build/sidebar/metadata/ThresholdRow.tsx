import { TargetIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { MetadataRow } from "./MetadataRow";

export function ThresholdRow(props: { threshold: number | null }) {
  const { threshold } = props;
  if (threshold === null) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip content={`Custom sensitivity of ${threshold * 100}%`}>
        <Chip icon={TargetIcon} className="font-mono">
          Threshold {threshold * 100}%
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}
