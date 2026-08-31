import config from "@/config";
import type { DeploymentAlias } from "@/database/models";

/**
 * Return the URL a deployment slug or branch alias is served on.
 */
export function getDeploymentUrl(slug: string) {
  const baseDomain = config.get("deployments.baseDomain");
  return new URL(`https://${slug}.${baseDomain}`).href;
}

type AliasLike = Pick<DeploymentAlias, "type" | "alias">;

/**
 * Whether an alias is a customer's own hostname rather than one of ours.
 *
 * `validateCustomDomain` refuses anything under the deployments base domain, so
 * not being under it is what makes an alias the customer's.
 */
export function checkIsCustomDomainAlias(alias: AliasLike): boolean {
  if (alias.type !== "domain") {
    return false;
  }
  const baseDomain = config.get("deployments.baseDomain").toLowerCase();
  const value = alias.alias.toLowerCase();
  return value !== baseDomain && !value.endsWith(`.${baseDomain}`);
}

/**
 * The URL an alias is reachable on. A `domain` alias is already a hostname; a
 * `branch` alias is a subdomain of the base domain.
 */
export function getDeploymentAliasUrl(alias: AliasLike): string {
  return alias.type === "domain"
    ? new URL(`https://${alias.alias}`).href
    : getDeploymentUrl(alias.alias);
}

/**
 * The URL to show a human when only one will fit — a commit status, a pull
 * request comment.
 *
 * The custom domain wins even though, unlike the slug URL, it follows whatever
 * is deployed to production next. Falling back to the slug rather than to the
 * internal domain keeps that mutability to the case where it is the point.
 */
export function getDeploymentPreferredUrl(input: {
  slug: string;
  aliases: AliasLike[];
}): string {
  const customDomain = input.aliases.find(checkIsCustomDomainAlias);
  return customDomain
    ? getDeploymentAliasUrl(customDomain)
    : getDeploymentUrl(input.slug);
}
