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
        .filter((domain) => {
          if (domain.environment !== "production") {
            return false;
          }
          if (domain.internal) {
            return true;
          }
          // No plan check here. The entitlement is enforced where a domain is
          // added, and losing it deliberately revokes nothing — see the Costs
          // note in infra/README.md. A check at this point could not revoke
          // anyway: the caller only ever upserts the aliases it is given and
          // never deletes the ones it is not, so dropping a domain from this
          // list would leave it serving whatever deployment it last pointed at,
          // frozen, which is worse than leaving it working.
          return domain.status === "active";
        })
        .map((domain) => ({
          type: "domain" as const,
          alias: domain.domain,
        })),
    );
  }

  return aliases;
}
