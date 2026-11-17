import type { DeploymentEnvironment } from "@argos/schemas/deployment";

import type { AuthProjectPayload } from "@/auth/payload";
import type { Project } from "@/database/models";
import { boom } from "@/util/error";

/**
 * Refuse a tokenless bearer a deployment to production, or of the production
 * branch, whose branch alias production deployments hold.
 *
 * Forging a bearer is not even needed: a pull request from a fork runs under
 * the fork's branch name, `main` included. Tokenless is enough to upload a
 * preview, not to choose what the team's domains serve.
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

  const isProductionBranch =
    await input.project.$getDeploymentProductionBranchMatcher();
  if (isProductionBranch(input.branch)) {
    throw boom(
      403,
      `Tokenless authentication cannot deploy the production branch "${input.branch}". Authenticate with GitHub Actions OIDC or set the ARGOS_TOKEN environment variable.`,
    );
  }
}
