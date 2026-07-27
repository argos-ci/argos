import { useOutletContext } from "react-router";

import type { ProjectPermission } from "@/gql/graphql";

export interface ProjectOutletContext {
  permissions: ProjectPermission[];
}

export function useProjectOutletContext() {
  return useOutletContext<ProjectOutletContext>();
}
