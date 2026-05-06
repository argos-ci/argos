import { slugify } from "@argos/util/slug";

import type { Deployment, ProjectDomain } from "@/database/models";

type DeploymentAliasRecord = {
  type: "branch" | "domain";
  alias: string;
};

/**
 * Get the aliases of a deployment.
 */
export function getDeploymentAliases(input: {
  accountSlug: string;
  projectName: string;
  deployment: Deployment;
  projectDomains?: ProjectDomain[];
}): DeploymentAliasRecord[] {
  const { accountSlug, projectName, deployment, projectDomains = [] } = input;
  const aliases: DeploymentAliasRecord[] = [
    {
      type: "branch",
      alias: slugify(`${projectName}-${deployment.branch}-${accountSlug}`),
    },
  ];

  if (deployment.environment === "production") {
    aliases.push(
      ...projectDomains
        .filter(
          (domain) => domain.environment === "production" && domain.internal,
        )
        .map((domain) => ({
          type: "domain" as const,
          alias: domain.domain,
        })),
    );
  }

  return aliases;
}
