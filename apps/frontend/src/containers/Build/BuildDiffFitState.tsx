import { createContext, use, useMemo } from "react";
import { invariant } from "@apollo/client/utilities/globals";

import { useStorageState } from "@/util/useStorageState";

interface DiffFitContextValue {
  contained: boolean;
  setContained: React.Dispatch<React.SetStateAction<boolean>>;
}

const DiffFitContext = createContext<DiffFitContextValue | null>(null);

export const useBuildDiffFitState = () => {
  const context = use(DiffFitContext);
  invariant(
    context,
    "useBuildDiffFitState must be used within a BuildDiffFitStateProvider",
  );
  return context;
};

const storageKey = "preferences.diffFit.contained";

export const BuildDiffFitStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [contained, setContained] = useStorageState(storageKey, true);
  const value = useMemo(
    (): DiffFitContextValue => ({ contained, setContained }),
    [contained, setContained],
  );
  return <DiffFitContext value={value}>{children}</DiffFitContext>;
};
