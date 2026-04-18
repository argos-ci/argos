import { slugify } from "@argos/util/slug";

import type { Deployment, ProjectDomain } from "@/database/models";

type DeploymentAlias = {
  type: "branch" | "domain";
  alias: string;
};

const INTERNAL_DEPLOYMENT_ALIASES = new Set(["dev"]);

export function isInternalDeploymentAlias(alias: string): boolean {
  return INTERNAL_DEPLOYMENT_ALIASES.has(alias.toLowerCase());
}

export function findInternalDeploymentAlias(
  aliases: DeploymentAlias[],
): DeploymentAlias | null {
  return (
    aliases.find((alias) => isInternalDeploymentAlias(alias.alias)) ?? null
  );
}

/**
 * Get the aliases of a deployment.
 */
export function getDeploymentAliases(input: {
  accountSlug: string;
  projectName: string;
  deployment: Deployment;
  projectDomains?: ProjectDomain[];
}): DeploymentAlias[] {
  const { accountSlug, projectName, deployment, projectDomains = [] } = input;
  const aliases: DeploymentAlias[] = [
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
