import { createContext, use, useMemo } from "react";
import { invariant } from "@argos/util/invariant";

import { useStorageState } from "@/util/useStorageState";

interface DiffVisibleContextValue {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const DiffVisibleContext = createContext<DiffVisibleContextValue | null>(null);

export function useBuildDiffVisibleState() {
  const context = use(DiffVisibleContext);
  invariant(
    context,
    "useBuildDiffVisibleState must be used within a BuildDiffVisibleStateProvider",
  );
  return context;
}

const storageKey = "preferences.overlay.visible";

export function BuildDiffVisibleStateProvider(props: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useStorageState(storageKey, true);
  const value = useMemo(
    (): DiffVisibleContextValue => ({ visible, setVisible }),
    [visible, setVisible],
  );
  return (
    <DiffVisibleContext value={value}>{props.children}</DiffVisibleContext>
  );
}
