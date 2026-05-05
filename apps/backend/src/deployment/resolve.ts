import config from "@/config";
import { knex } from "@/database";
import type { DeploymentAlias } from "@/database/models";
import { Deployment } from "@/database/models/Deployment";

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
};

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

  const result = (await knex("deployments")
    .select(
      "deployments.id",
      "deployments.projectId",
      "deployments.environment",
      "deployment_aliases.type",
    )
    .leftJoin(
      "deployment_aliases",
      "deployment_aliases.deploymentId",
      "deployments.id",
    )
    .where((query) => {
      query
        .whereIn("deployment_aliases.alias", aliases)
        .orWhereIn("deployments.slug", aliases);
    })
    .first()) as
    | {
        id: string;
        projectId: string;
        environment: Deployment["environment"];
        type: DeploymentAlias["type"] | null;
      }
    | undefined;

  return result
    ? {
        id: result.id,
        projectId: result.projectId,
        environment: result.environment,
        type: result.type ?? "slug",
      }
    : null;
}
