import config from "@/config";
import { knex } from "@/database";
import type { DeploymentAlias } from "@/database/models";
import type { Deployment } from "@/database/models/Deployment";
import type { Project } from "@/database/models/Project";

/**
 * Build the candidate aliases that resolve a deployment from a domain or URL.
 * Includes the hostname itself plus, if it sits under the deployments base
 * domain, the leading subdomain treated as a slug.
 */
export function getDeploymentAliasCandidates(domain: string): string[] {
  const value = domain.trim().toLowerCase();
  if (!value) {
    return [];
  }

  let hostname = value;
  if (value.includes("://")) {
    try {
      hostname = new URL(value).hostname.toLowerCase();
    } catch {
      return [];
    }
  }

  const candidates = new Set<string>([hostname]);
  const baseDomain = config.get("deployments.baseDomain").toLowerCase();
  const suffix = `.${baseDomain}`;
  if (hostname.endsWith(suffix)) {
    const alias = hostname.slice(0, -suffix.length);
    if (alias) {
      candidates.add(alias);
    }
  }

  return Array.from(candidates);
}

type ResolvedDeploymentResult = {
  id: string;
  projectId: string;
  environment: Deployment["environment"];
  type: DeploymentAlias["type"] | "slug";
  project: Pick<Project, "deploymentAuth">;
};

type ResolvedDeploymentRow = {
  id: string;
  projectId: string;
  environment: Deployment["environment"];
  type: DeploymentAlias["type"];
  deploymentAuth: Project["deploymentAuth"];
};

function serializeResolvedDeploymentRow(
  result: Omit<ResolvedDeploymentRow, "type"> & {
    type: DeploymentAlias["type"] | "slug";
  },
): ResolvedDeploymentResult {
  return {
    id: result.id,
    projectId: result.projectId,
    environment: result.environment,
    type: result.type,
    project: {
      deploymentAuth: result.deploymentAuth,
    },
  };
}

/**
 * Resolve a deployment from a domain or URL. Returns null if no deployment
 * matches any of the candidate aliases.
 */
export async function resolveDeploymentByDomain(
  domain: string,
): Promise<ResolvedDeploymentResult | null> {
  const aliases = getDeploymentAliasCandidates(domain);
  if (aliases.length === 0) {
    return null;
  }

  const orderByAliasPriority = aliases
    .map(() => "when deployment_aliases.alias = ? then ?")
    .join(" ");

  const aliasResult = (await knex("deployment_aliases")
    .select(
      "deployments.id",
      "deployments.projectId",
      "deployments.environment",
      "deployment_aliases.type",
      "projects.deploymentAuth",
    )
    .join("deployments", "deployments.id", "deployment_aliases.deploymentId")
    .join("projects", "projects.id", "deployments.projectId")
    .where("projects.deploymentEnabled", true)
    .whereIn("deployment_aliases.alias", aliases)
    .orderByRaw(`case ${orderByAliasPriority} else ? end`, [
      ...aliases.flatMap((alias, index) => [alias, index]),
      aliases.length,
    ])
    .first()) as ResolvedDeploymentRow | undefined;

  if (aliasResult) {
    return serializeResolvedDeploymentRow(aliasResult);
  }

  const slugResult = (await knex("deployments")
    .select(
      "deployments.id",
      "deployments.projectId",
      "deployments.environment",
      "projects.deploymentAuth",
    )
    .join("projects", "projects.id", "deployments.projectId")
    .where("projects.deploymentEnabled", true)
    .whereIn("deployments.slug", aliases)
    .first()) as Omit<ResolvedDeploymentRow, "type"> | undefined;

  return slugResult
    ? serializeResolvedDeploymentRow({ ...slugResult, type: "slug" })
    : null;
}
