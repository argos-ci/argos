import { GitCompareArrowsIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Tooltip, TooltipContainer, TooltipHeader } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { MetadataRow } from "./MetadataRow";

/**
 * Shown when a snapshot was compared against a baseline stored under a
 * different name, which happens when `baseName` lists several candidates and
 * the snapshot's own name is missing from the baseline.
 */
export function BaselineRow(props: { diff: Diff }) {
  const { baseScreenshot, compareScreenshot } = props.diff;
  if (!baseScreenshot || !compareScreenshot) {
    return null;
  }
  if (baseScreenshot.name === compareScreenshot.name) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip
        content={
          <TooltipContainer>
            <TooltipHeader icon={GitCompareArrowsIcon}>
              Fallback baseline
            </TooltipHeader>
            <p>
              <strong className="font-medium">{compareScreenshot.name}</strong>{" "}
              was not found in the baseline build, so it was compared against{" "}
              <strong className="font-medium">{baseScreenshot.name}</strong>{" "}
              instead.
            </p>
            <p>This comes from the snapshot’s baseName setting.</p>
          </TooltipContainer>
        }
      >
        <Chip icon={GitCompareArrowsIcon}>Baseline {baseScreenshot.name}</Chip>
      </Tooltip>
    </MetadataRow>
  );
}
