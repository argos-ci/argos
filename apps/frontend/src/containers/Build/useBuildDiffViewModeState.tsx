import { createContext, use, useMemo } from "react";
import { invariant } from "@argos/util/invariant";

import { useStorageState } from "@/util/useStorageState";

type ViewMode = "split" | "baseline" | "changes";

interface DiffViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
}

const DiffViewModeContext = createContext<DiffViewModeContextValue | null>(
  null,
);

export function useBuildDiffViewModeState() {
  const context = use(DiffViewModeContext);
  invariant(
    context,
    "useBuildDiffViewModeState must be used within a BuildDiffViewModeStateProvider",
  );
  return context;
}

const storageKey = "preferences.diffViewMode";

export function BuildDiffViewModeStateProvider(props: {
  children: React.ReactNode;
}) {
  const [viewMode, setViewMode] = useStorageState<ViewMode>(
    storageKey,
    "split",
  );
  const value = useMemo(
    (): DiffViewModeContextValue => ({
      viewMode,
      setViewMode,
    }),
    [viewMode, setViewMode],
  );
  return (
    <DiffViewModeContext value={value}>{props.children}</DiffViewModeContext>
  );
}
