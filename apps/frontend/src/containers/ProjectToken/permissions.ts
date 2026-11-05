import { ProjectTokenPermission } from "@/gql/graphql";

export const PROJECT_TOKEN_PERMISSIONS: {
  value: ProjectTokenPermission;
  title: string;
  description: string;
}[] = [
  {
    value: ProjectTokenPermission.BuildsWrite,
    title: "Upload builds",
    description: "Create, update and finalize builds and their screenshots.",
  },
  {
    value: ProjectTokenPermission.DeploymentsWrite,
    title: "Upload deployments",
    description: "Create and finalize deployments.",
  },
  {
    value: ProjectTokenPermission.ProjectsRead,
    title: "Read projects",
    description: "Read builds, screenshot diffs, tests and deployments.",
  },
  {
    value: ProjectTokenPermission.MediaRead,
    title: "Read media",
    description: "Read the images and videos uploaded to the projects.",
  },
  {
    value: ProjectTokenPermission.MediaWrite,
    title: "Upload media",
    description:
      "Upload images and videos, and delete the ones already uploaded.",
  },
];

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
