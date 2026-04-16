import config from "@/config";

/**
 * Return a deployment URL from an alias.
 */
export function getDeploymentUrl(slug: string) {
  const baseDomain = config.get("deployments.baseDomain");
  return new URL(`https://${slug}.${baseDomain}`).href;
}
