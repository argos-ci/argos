import { createContext } from "react";

import { ProjectPermission } from "@/gql/graphql";

export const ProjectPermissionsContext = createContext<
  ProjectPermission[] | null
>(null);
