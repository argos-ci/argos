import { invariant } from "@argos/util/invariant";
import { WaypointsIcon } from "lucide-react";

import { ChipLink } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { getFlowURL } from "../../../Flow/FlowParams";
import { useActiveDiffFlow } from "../../BuildDiffState";
import { useBuildParams } from "../../BuildParams";
import { MetadataRow } from "./MetadataRow";

/**
 * The journey the active screenshot is a step of, and where in it: the test
 * row above says which test took the screenshot, this one says what that
 * test walks through — and opens the flow on this build.
 */
export function FlowRow() {
  const flow = useActiveDiffFlow();
  const params = useBuildParams();
  invariant(params, "can't be used outside of a build route");
  if (!flow) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip content="Open flow">
        <ChipLink
          href={getFlowURL(params, flow.identity.key, {
            build: params.buildNumber,
          })}
          icon={WaypointsIcon}
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
