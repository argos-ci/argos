import { AlertTriangleIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Tooltip, TooltipContainer, TooltipHeader } from "@/ui/Tooltip";

import { getBrowserLabel } from "../../metadata/browser/browserLabels";
import type { BrowserVersionChange } from "../../metadata/browser/browserVersionChange";
import { MetadataRow } from "./MetadataRow";

export function BrowserVersionRow(props: {
  change: BrowserVersionChange | null;
  /** Holds the tooltip open, for stories. */
  tooltipOpen?: boolean;
}) {
  const { change, tooltipOpen } = props;
  if (!change) {
    return null;
  }
  const label = getBrowserLabel(change.name);
  return (
    <MetadataRow>
      <Tooltip
        open={tooltipOpen}
        content={
          <TooltipContainer>
            <TooltipHeader icon={AlertTriangleIcon}>
              Browser version changed
            </TooltipHeader>
            <p>
              The baseline was taken with {label} {change.baseVersion}, this
              snapshot with {label} {change.compareVersion}.
            </p>
            <p>Some changes may come from the browser, not your code.</p>
          </TooltipContainer>
        }
      >
        <Chip
          icon={AlertTriangleIcon}
          color="warning"
          className="cursor-default"
        >
          Baseline v{change.baseVersion}
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}
