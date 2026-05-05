import { z } from "zod";

import config from "@/config";
import { knex } from "@/database";

const CloudflarePurgeResponseSchema = z.object({
  success: z.literal(true),
});

function getDeploymentDomainCandidates(aliasOrDomain: string): string[] {
  const value = aliasOrDomain.trim().toLowerCase();
  const baseDomain = config.get("deployments.baseDomain").toLowerCase();
  const suffix = `.${baseDomain}`;
  const candidates = new Set<string>([value]);

  if (value.endsWith(suffix)) {
    const alias = value.slice(0, -suffix.length);
    if (alias) {
      candidates.add(alias);
    }
  } else {
    candidates.add(`${value}.${baseDomain}`);
  }

  return Array.from(candidates);
}

function getResolveDeploymentDomainUrls(aliasOrDomain: string): string[] {
  const apiBaseUrl = config.get("api.baseUrl");
  return getDeploymentDomainCandidates(aliasOrDomain).map(
    (candidate) =>
      `${apiBaseUrl}/v2/deployments/resolve/${encodeURIComponent(candidate)}`,
  );
}

async function getProjectDeploymentCacheAliases(
  projectId: string,
): Promise<string[]> {
  const rows = (await knex("deployments")
    .select("deployments.slug", "deployment_aliases.alias")
    .leftJoin(
      "deployment_aliases",
      "deployment_aliases.deploymentId",
      "deployments.id",
    )
    .where("deployments.projectId", projectId)) as {
    slug: string;
    alias: string | null;
  }[];

  const aliases = new Set<string>();
  rows.forEach((row) => {
    aliases.add(row.slug);
    if (row.alias) {
      aliases.add(row.alias);
    }
  });

  return Array.from(aliases);
}

/**
 * Invalidate deployment-domain resolution responses cached by Cloudflare.
 *
 * No-ops when Cloudflare credentials are not configured, which keeps local
 * development and unconfigured environments working.
 */
export async function invalidateDeploymentCache(alias: string): Promise<void> {
  const zoneId = config.get("deployments.cloudflare.zoneId");
  const apiToken = config.get("deployments.cloudflare.apiToken");

  if (!zoneId || !apiToken) {
    return;
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: getResolveDeploymentDomainUrls(alias),
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Cloudflare purge failed with status ${response.status} for alias "${alias}"`,
    );
  }

  const parsed = CloudflarePurgeResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      `Cloudflare purge returned an invalid response for alias "${alias}"`,
    );
  }
}

export async function invalidateProjectDeploymentCache(
  projectId: string,
): Promise<void> {
  const aliases = await getProjectDeploymentCacheAliases(projectId);

  await Promise.all(
    aliases.map((alias) => {
      return invalidateDeploymentCache(alias);
    }),
  );
}
