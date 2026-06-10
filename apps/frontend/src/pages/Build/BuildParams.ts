import { useMemo } from "react";
import { useParams } from "react-router-dom";

import {
  getProjectURL,
  useProjectParams,
  type ProjectParams,
} from "../Project/ProjectParams";

export interface BuildParams extends ProjectParams {
  buildNumber: number;
  /**
   * Active screenshot diff ID, or `null` when the build overview is shown.
   */
  diffId?: string | null | undefined;
}

/**
 * Reserved diff ID segment for the build overview page.
 */
const OVERVIEW_SEGMENT = "overview";

/**
 * Returns parameters for a build page.
 */
export function useBuildParams(): BuildParams | null {
  const { buildNumber, diffId } = useParams();
  const projectParams = useProjectParams();
  const params = useMemo(() => {
    if (!projectParams || !buildNumber) {
      return null;
    }
    const numBuildNumber = Number(buildNumber);
    const valid =
      // Integer.
      Number.isInteger(numBuildNumber) &&
      // Positive.
      numBuildNumber > 0 &&
      // Signed 32-bit.
      numBuildNumber < 2147483647;
    if (!valid) {
      return null;
    }
    return {
      ...projectParams,
      buildNumber: numBuildNumber,
      diffId: diffId === OVERVIEW_SEGMENT ? null : (diffId ?? null),
    };
  }, [projectParams, buildNumber, diffId]);
  return params;
}

export function getBuildURL(params: BuildParams): string {
  return `${getProjectURL(params)}/builds/${params.buildNumber}${params.diffId ? `/${params.diffId}` : ""}`;
}

export function getBuildOverviewURL(params: BuildParams): string {
  return getBuildURL({ ...params, diffId: OVERVIEW_SEGMENT });
}
