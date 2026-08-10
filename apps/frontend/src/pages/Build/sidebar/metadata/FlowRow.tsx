import { invariant } from "@argos/util/invariant";
import { WaypointsIcon } from "lucide-react";

import { ChipLink } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { getFlowURL } from "../../../Project/Flows/util";
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
  if (!flow) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip content="Open flow">
        <ChipLink
          href={getFlowURL(params, flow.identity.key)}
          aria-label="Open flow"
          icon={<WaypointsIcon />}
        >
          {flow.identity.title}
          {flow.stepIndex !== -1
            ? ` · step ${flow.stepIndex + 1}/${flow.steps.length}`
            : null}
        </ChipLink>
      </Tooltip>
    </MetadataRow>
  );
}
