import { useMemo } from "react";
import { useParams } from "react-router";

import {
  getProjectURL,
  useProjectParams,
  type ProjectParams,
} from "../Project/ProjectParams";

export interface FlowParams extends ProjectParams {
  /** The flow identity key (test title path, or story component). */
  flowKey: string;
}

/**
 * Returns parameters for a flow page. The flow is identified by its key in
 * the URL, percent-encoded.
 */
export function useFlowParams(): FlowParams | null {
  const { flowId } = useParams();
  const projectParams = useProjectParams();
  return useMemo(() => {
    if (!projectParams || !flowId) {
      return null;
    }
    return { ...projectParams, flowKey: decodeURIComponent(flowId) };
  }, [projectParams, flowId]);
}

export function getFlowsURL(params: ProjectParams): string {
  return `${getProjectURL(params)}/flows`;
}

export function getFlowURL(
  params: ProjectParams,
  flowKey: string,
  options: { build?: number } = {},
): string {
  const search =
    options.build === undefined ? "" : `?build=${String(options.build)}`;
  return `${getFlowsURL(params)}/${encodeURIComponent(flowKey)}${search}`;
}
