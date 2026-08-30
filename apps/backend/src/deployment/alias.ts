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
  customDomainsEnabled?: boolean;
}): DeploymentAliasRecord[] {
  const {
    accountSlug,
    projectName,
    deployment,
    projectDomains = [],
    customDomainsEnabled = false,
  } = input;
  const aliases: DeploymentAliasRecord[] = [
    {
      type: "branch",
      alias: slugify(`${projectName}-${deployment.branch}-${accountSlug}`),
    },
  ];

  if (deployment.environment === "production") {
    aliases.push(
      ...projectDomains
        .filter((domain) => {
          if (domain.environment !== "production") {
            return false;
          }
          if (domain.internal) {
            return true;
          }
          // Re-checked on every deployment rather than only when the domain is
          // added: an account that downgrades keeps its rows, and gating the
          // mutation alone would let it serve custom domains forever.
          return customDomainsEnabled && domain.status === "active";
        })
        .map((domain) => ({
          type: "domain" as const,
          alias: domain.domain,
        })),
    );
  }

  return aliases;
}
