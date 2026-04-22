import { sqids } from "@/util/sqids";

const DEPLOYMENT_ID_PREFIX = "dep_";

/**
 * Encodes a deployment model ID into the public GraphQL identifier format.
 */
export function formatDeploymentId(deploymentId: string | number): string {
  return `${DEPLOYMENT_ID_PREFIX}${sqids.encode([Number(deploymentId)])}`;
}

/**
 * Decodes a public deployment identifier back to the underlying model ID.
 */
export function parseDeploymentId(input: string): string {
  if (!input.startsWith(DEPLOYMENT_ID_PREFIX)) {
    throw new Error("Invalid deployment ID format");
  }

  const decoded = sqids.decode(input.slice(DEPLOYMENT_ID_PREFIX.length))[0];
  if (decoded === undefined) {
    throw new Error("Invalid deployment ID format");
  }

  return String(decoded);
}
