import { generateRandomString } from "@/database/services/crypto";

/**
 * Generate a deployment slug.
 */
export function generateDeploymentSlug(input: {
  accountSlug: string;
  projectName: string;
}) {
  const { accountSlug, projectName } = input;
  return `${projectName}-${generateRandomString(9)}-${accountSlug}`;
}
