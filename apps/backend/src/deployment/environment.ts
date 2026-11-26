import type { DeploymentEnvironment } from "@argos/schemas/deployment";

import type { Project } from "@/database/models";

/**
 * The environment a deployment of `branch` goes to when none is given:
 * `production` on a branch matching the project's production branch glob,
 * `preview` otherwise.
 */
export async function getEnvironmentFromBranch(args: {
  project: Project;
  branch: string;
}): Promise<DeploymentEnvironment> {
  const { project, branch } = args;
  const isProductionBranch =
    await project.$getDeploymentProductionBranchMatcher();
  return isProductionBranch(branch) ? "production" : "preview";
}
