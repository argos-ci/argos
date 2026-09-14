import { slugify } from "@argos/util/slug";

import { generateRandomString } from "@/database/services/crypto";

/**
 * The slug is the first label of `<slug>.<baseDomain>`, and a DNS label holds
 * at most 63 characters.
 */
export const DEPLOYMENT_SLUG_MAX_LENGTH = 63;

const RANDOM_PART_LENGTH = 9;

/**
 * Cut a slug to `maxLength` without leaving a hyphen at the end.
 */
function trimSlug(slug: string, maxLength: number): string {
  return slug.slice(0, maxLength).replace(/-+$/, "");
}

/**
 * Generate a deployment slug: `<project>-<random>-<account>`.
 *
 * The names are slugified rather than used as they are because the slug is
 * looked up by the hostname it becomes, which `new URL()` and browsers
 * lowercase, against an exact match on `deployments.slug`. Project names may
 * carry uppercase letters, dots and underscores, and account slugs created
 * before the slug rules existed may carry uppercase letters too.
 *
 * The random part is what keeps the slug unique, so when both names together
 * are too long for a label it is the account slug that gets shortened, never
 * the random part.
 */
export function generateDeploymentSlug(input: {
  accountSlug: string;
  projectName: string;
}): string {
  const random = generateRandomString(RANDOM_PART_LENGTH);
  const budget = DEPLOYMENT_SLUG_MAX_LENGTH - RANDOM_PART_LENGTH - 2;
  const project = trimSlug(slugify(input.projectName), budget);
  const account = trimSlug(slugify(input.accountSlug), budget - project.length);
  return [project, random, account].filter(Boolean).join("-");
}
