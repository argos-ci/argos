import { invariant } from "@argos/util/invariant";
import { WaypointsIcon } from "lucide-react";

import { ChipLink } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { getFlowURL, useStoredNames } from "../../../Project/Flows/util";
import { useProjectParams } from "../../../Project/ProjectParams";
import { useActiveDiffFlow } from "../../BuildDiffState";
import { MetadataRow } from "./MetadataRow";

/**
 * The journey the active screenshot belongs to, linking to the flow view.
 */
export function FlowRow() {
  const flow = useActiveDiffFlow();
  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");
  const { names } = useStoredNames(params);
  if (!flow) {
    return null;
  }
  const displayName = names[flow.identity.key] ?? flow.identity.title;
  return (
    <MetadataRow>
      <Tooltip content="Open flow">
        <ChipLink
          href={getFlowURL(params, flow.identity.key)}
          aria-label="Open flow"
          icon={<WaypointsIcon />}
        >
          {displayName}
          {flow.stepIndex !== -1
            ? ` · step ${flow.stepIndex + 1}/${flow.steps.length}`
            : null}
        </ChipLink>
      </Tooltip>
    </MetadataRow>
  );
}
