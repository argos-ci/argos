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
      <Tooltip content="Diff sensitivity threshold between 0 and 1. The higher the threshold, the less sensitive the diff will be. Defaults to 0.5.">
        <Chip icon={TargetIcon}>Threshold {threshold}</Chip>
      </Tooltip>
    </MetadataRow>
  );
}
