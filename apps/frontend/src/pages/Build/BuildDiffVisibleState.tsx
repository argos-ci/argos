import { createContext, useContext, useMemo } from "react";
import { invariant } from "@argos/util/invariant";

import { useStorageState } from "@/util/useStorageState";

interface DiffVisibleContextValue {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const DiffVisibleContext = createContext<DiffVisibleContextValue | null>(null);

export const useBuildDiffVisibleState = () => {
  const context = useContext(DiffVisibleContext);
  invariant(
    context,
    "useBuildDiffVisibleState must be used within a BuildDiffVisibleStateProvider",
  );
  return context;
};

const storageKey = "preferences.overlay.visible";

export const BuildDiffVisibleStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [visible, setVisible] = useStorageState(storageKey, true);
  const value = useMemo(
    (): DiffVisibleContextValue => ({ visible, setVisible }),
    [visible, setVisible],
  );
  return (
    <DiffVisibleContext.Provider value={value}>
      {children}
    </DiffVisibleContext.Provider>
  );
};
