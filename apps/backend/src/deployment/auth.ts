import { assertNever } from "@argos/util/assertNever";

import type { DeploymentAlias } from "@/database/models";
import type { Deployment } from "@/database/models/Deployment";
import type { Project } from "@/database/models/Project";

type DeploymentVisibility = "private" | "public";

type DeploymentAuthInput = Pick<Project, "deploymentAuth">;

type DeploymentVisibilityInput = Pick<Deployment, "environment"> & {
  type: DeploymentAlias["type"] | "slug";
};

export function getDeploymentVisibility(input: {
  deployment: DeploymentVisibilityInput;
  project: DeploymentAuthInput;
}): DeploymentVisibility {
  switch (input.project.deploymentAuth) {
    case "public":
      return "public";
    case "private":
      return "private";
    case "domain-private":
      return input.deployment.environment === "production" &&
        input.deployment.type === "domain"
        ? "public"
        : "private";
    default:
      assertNever(input.project.deploymentAuth);
  }
}
