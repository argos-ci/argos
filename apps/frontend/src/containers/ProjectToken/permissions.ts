import {
  PROJECT_TOKEN_PERMISSION_LIST,
  PROJECT_TOKEN_PERMISSIONS as CATALOG,
  type ProjectTokenPermission as CatalogPermission,
} from "@argos/schemas/project-token";

import { ProjectTokenPermission } from "@/gql/graphql";

const GRAPHQL_PERMISSIONS = {
  "builds:write": ProjectTokenPermission.BuildsWrite,
  "deployments:write": ProjectTokenPermission.DeploymentsWrite,
  "projects:read": ProjectTokenPermission.ProjectsRead,
  "media:read": ProjectTokenPermission.MediaRead,
  "media:write": ProjectTokenPermission.MediaWrite,
} satisfies Record<CatalogPermission, ProjectTokenPermission>;

export const PROJECT_TOKEN_PERMISSIONS: {
  value: ProjectTokenPermission;
  title: string;
  description: string;
}[] = PROJECT_TOKEN_PERMISSION_LIST.map((permission) => ({
  value: GRAPHQL_PERMISSIONS[permission],
  ...CATALOG[permission],
}));

export const ALL_PROJECT_TOKEN_PERMISSIONS: readonly ProjectTokenPermission[] =
  PROJECT_TOKEN_PERMISSIONS.map((permission) => permission.value);

export const STANDARD_PERMISSIONS = {
  label: "Standard",
  description:
    "Upload builds and deployments, read projects, and upload or delete media.",
};

export function formatProjectTokenPermissions(
  permissions: ProjectTokenPermission[],
): string {
  if (
    ALL_PROJECT_TOKEN_PERMISSIONS.every((permission) =>
      permissions.includes(permission),
    )
  ) {
    return "Standard permissions";
  }
  return PROJECT_TOKEN_PERMISSIONS.filter((permission) =>
    permissions.includes(permission.value),
  )
    .map((permission) => permission.title)
    .join(", ");
}
