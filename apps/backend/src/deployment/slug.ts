import { slugify } from "@argos/util/slug";

import { generateRandomString } from "@/database/services/crypto";

/**
 * Get the alias of a project deployment.
 */
export function generateDeploymentProjectAlias(input: {
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
