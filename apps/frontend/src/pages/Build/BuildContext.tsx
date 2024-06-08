import { createContext, useContext, useMemo } from "react";

import { ProjectPermission } from "@/gql/graphql";

type BuildContextValue = {
  permissions: ProjectPermission[] | null;
};

const BuildContext = createContext<BuildContextValue | null>(null);

export function BuildContextProvider(props: {
  children: React.ReactNode;
  permissions: ProjectPermission[] | null;
}) {
  const value = useMemo(
    () => ({ permissions: props.permissions }),
    [props.permissions],
  );
  return (
    <BuildContext.Provider value={value}>
      {props.children}
    </BuildContext.Provider>
  );
}

export function useProjectPermissions() {
  const context = useContext(BuildContext);
  if (!context) {
    throw new Error(
      "useProjectPermissions must be used within a BuildContextProvider",
    );
  }
  return context.permissions;
}
