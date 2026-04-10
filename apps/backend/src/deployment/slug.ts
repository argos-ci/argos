import { slugify } from "@argos/util/slug";

import { generateRandomString } from "@/database/services/crypto";

/**
 * Generates a unique slug for a deployment by combining the project name,
 * a random string, and the account slug.
 */
export function generateDeploymentSlug(input: {
  accountSlug: string;
  projectName: string;
}) {
  return slugify(
    `${input.projectName}-${generateRandomString(9)}-${input.accountSlug}`,
  );
}

/**
 * Get the alias of the production deployment.
 */
export function getDeploymentProductionAlias(input: {
  accountSlug: string;
  projectName: string;
}) {
  return slugify(`${input.projectName}-${input.accountSlug}`);
}
