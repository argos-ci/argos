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

const ALL_PROJECT_TOKEN_PERMISSIONS = PROJECT_TOKEN_PERMISSIONS.map(
  (permission) => permission.value,
);

/**
 * What a token is offered with, the way the OAuth consent screen offers
 * levels; the individual permissions are one click further.
 */
export const PROJECT_TOKEN_PRESETS = [
  {
    value: "upload",
    label: "Upload from CI",
    description: "Upload builds and deployments: all CI needs.",
    permissions: [
      ProjectTokenPermission.BuildsWrite,
      ProjectTokenPermission.DeploymentsWrite,
    ],
  },
  {
    value: "read",
    label: "Read only",
    description: "Read builds, screenshot diffs, tests, deployments and media.",
    permissions: [
      ProjectTokenPermission.ProjectsRead,
      ProjectTokenPermission.MediaRead,
    ],
  },
  {
    value: "full",
    label: "Full access",
    description:
      "Upload builds and deployments, read projects, and upload or delete media.",
    permissions: ALL_PROJECT_TOKEN_PERMISSIONS,
  },
] as const satisfies readonly {
  value: string;
  label: string;
  description: string;
  permissions: readonly ProjectTokenPermission[];
}[];

export type ProjectTokenPreset = (typeof PROJECT_TOKEN_PRESETS)[number];

export const UPLOAD_PRESET = PROJECT_TOKEN_PRESETS[0];

function isSamePermissionSet(
  a: readonly ProjectTokenPermission[],
  b: readonly ProjectTokenPermission[],
) {
  return (
    a.length === b.length && a.every((permission) => b.includes(permission))
  );
}

export function formatProjectTokenPermissions(
  permissions: ProjectTokenPermission[],
): string {
  const preset = PROJECT_TOKEN_PRESETS.find((preset) =>
    isSamePermissionSet(preset.permissions, permissions),
  );
  if (preset) {
    return preset.label;
  }
  return PROJECT_TOKEN_PERMISSIONS.filter((permission) =>
    permissions.includes(permission.value),
  )
    .map((permission) => permission.title)
    .join(", ");
}
