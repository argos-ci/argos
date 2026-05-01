import config from "@/config";
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

/**
 * Resolve a deployment from a domain or URL. Returns null if no deployment
 * matches any of the candidate aliases.
 */
export async function resolveDeploymentByDomain(
  domain: string,
): Promise<Pick<Deployment, "id" | "projectId" | "environment"> | null> {
  const aliases = getDeploymentAliasCandidates(domain);
  if (aliases.length === 0) {
    return null;
  }

  const deployment = await Deployment.query()
    .select(
      "deployments.id",
      "deployments.projectId",
      "deployments.environment",
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
    .first();

  return deployment ?? null;
}
