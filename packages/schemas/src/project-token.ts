/**
 * What a project token can do on the projects it is linked to.
 *
 * The ids match the OAuth scopes that cover the same endpoints, so an API
 * operation declares one list for both. `deployments:write` has no OAuth
 * counterpart: deployments are only ever uploaded from CI. Shared with the
 * frontend, which shows the same titles and descriptions.
 */
export const PROJECT_TOKEN_PERMISSIONS = {
  "builds:write": {
    title: "Upload builds",
    description: "Create, update and finalize builds and their screenshots.",
  },
  "deployments:write": {
    title: "Upload deployments",
    description: "Create and finalize deployments.",
  },
  "projects:read": {
    title: "Read projects",
    description: "Read builds, screenshot diffs, tests and deployments.",
  },
  "media:read": {
    title: "Read media",
    description: "Read the images and videos uploaded to the projects.",
  },
  "media:write": {
    title: "Upload media",
    description:
      "Upload images and videos, and delete the ones already uploaded.",
  },
} as const satisfies Record<string, { title: string; description: string }>;

export type ProjectTokenPermission = keyof typeof PROJECT_TOKEN_PERMISSIONS;

function isProjectTokenPermission(
  value: string,
): value is ProjectTokenPermission {
  return Object.hasOwn(PROJECT_TOKEN_PERMISSIONS, value);
}

export const PROJECT_TOKEN_PERMISSION_LIST: ProjectTokenPermission[] =
  Object.keys(PROJECT_TOKEN_PERMISSIONS).filter(isProjectTokenPermission);
