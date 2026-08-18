import { WaypointsIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { useActiveDiffFlow } from "../../BuildDiffState";
import { MetadataRow } from "./MetadataRow";

/**
 * The journey the active screenshot is a step of, and where in it: the test
 * row above says which test took the screenshot, this one says what that
 * test walks through.
 */
export function FlowRow() {
  const flow = useActiveDiffFlow();
  if (!flow) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip content={`Flow: ${flow.identity.key}`}>
        <Chip icon={WaypointsIcon}>
          {flow.identity.title}
          {flow.stepIndex !== -1
            ? ` · step ${flow.stepIndex + 1}/${flow.steps.length}`
            : null}
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}
