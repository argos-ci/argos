import config from "@/config";

function getResolveDeploymentDomainUrls(alias: string): string[] {
  const apiBaseUrl = config.get("api.baseUrl");
  const baseDomain = config.get("deployments.baseDomain");
  const encodedAlias = encodeURIComponent(alias);
  const encodedDomain = encodeURIComponent(`${alias}.${baseDomain}`);

  return [
    `${apiBaseUrl}/v2/deployments/resolve/${encodedAlias}`,
    `${apiBaseUrl}/v2/deployments/resolve/${encodedDomain}`,
  ];
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

  const body = (await response.json()) as { success?: unknown };
  if (body.success !== true) {
    throw new Error(`Cloudflare purge failed for alias "${alias}"`);
  }
}
