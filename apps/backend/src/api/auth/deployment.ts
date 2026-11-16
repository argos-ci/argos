import type { DeploymentEnvironment } from "@argos/schemas/deployment";
import { minimatch } from "minimatch";

import type { AuthProjectPayload } from "@/auth/payload";
import type { Project } from "@/database/models";
import { boom } from "@/util/error";

/**
 * Refuse a tokenless bearer a deployment to production, or of the production
 * branch, whose branch alias production deployments hold.
 *
 * Tokenless proves only that a workflow run of the repository is in progress.
 * Anyone can read one on a public repository, and a pull request from a fork
 * runs under the fork's branch name, `main` included. That is enough to upload
 * a build or a preview, not to choose what the team's domains serve.
 */
export async function assertAuthCanDeploy(
  auth: AuthProjectPayload,
  input: {
    project: Project;
    environment: DeploymentEnvironment;
    branch: string;
  },
): Promise<void> {
  if (auth.source !== "github-actions-tokenless") {
    return;
  }

  if (input.environment === "production") {
    throw boom(
      403,
      "Tokenless authentication cannot deploy to production. Authenticate with GitHub Actions OIDC or set the ARGOS_TOKEN environment variable.",
    );
  }

  const productionBranchGlob =
    await input.project.$getDeploymentProductionBranchGlob();
  if (minimatch(input.branch, productionBranchGlob)) {
    throw boom(
      403,
      `Tokenless authentication cannot deploy the production branch "${input.branch}". Authenticate with GitHub Actions OIDC or set the ARGOS_TOKEN environment variable.`,
    );
  }
}
