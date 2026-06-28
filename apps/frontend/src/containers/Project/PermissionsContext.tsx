import { createContext } from "react";

import { ProjectPermission } from "@/gql/graphql";
import { useNonNullable } from "@/util/useNonNullable";

export const ProjectPermissionsContext = createContext<
  ProjectPermission[] | null
>(null);

/**
 * Returns the current project's permissions, asserting they are provided. Use
 * within a project route, where `ProjectPermissionsContext` is always set.
 */
export function useProjectPermissions(): ProjectPermission[] {
  return useNonNullable(
    ProjectPermissionsContext,
    "Project permissions must be provided",
  );
}

/** Whether the current user has the given permission on the project. */
export function useProjectPermission(permission: ProjectPermission): boolean {
  return useProjectPermissions().includes(permission);
}
