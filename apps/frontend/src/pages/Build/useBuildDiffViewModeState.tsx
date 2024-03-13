import { createContext, useContext, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";

type ViewMode = "split" | "baseline" | "changes";

interface DiffViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
}

const DiffViewModeContext = createContext<DiffViewModeContextValue | null>(
  null,
);

export const useBuildDiffViewModeState = () => {
  const context = useContext(DiffViewModeContext);
  invariant(
    context,
    "useBuildDiffViewModeState must be used within a BuildDiffViewModeStateProvider",
  );
  return context;
};

export const BuildDiffViewModeStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [viewMode, setViewMode] = useState("split" as ViewMode);
  const value = useMemo(
    (): DiffViewModeContextValue => ({
      viewMode,
      setViewMode,
    }),
    [viewMode, setViewMode],
  );
  return (
    <DiffViewModeContext.Provider value={value}>
      {children}
    </DiffViewModeContext.Provider>
  );
};
