import { createContext, useContext, useMemo, useState } from "react";
import { invariant } from "@apollo/client/utilities/globals";

interface DiffFitContextValue {
  contained: boolean;
  setContained: React.Dispatch<React.SetStateAction<boolean>>;
}

const DiffFitContext = createContext<DiffFitContextValue | null>(null);

export const useBuildDiffFitState = () => {
  const context = useContext(DiffFitContext);
  invariant(
    context,
    "useBuildDiffFitState must be used within a BuildDiffFitStateProvider",
  );
  return context;
};

export const BuildDiffFitStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [contained, setContained] = useState(true);
  const value = useMemo(
    (): DiffFitContextValue => ({ contained, setContained }),
    [contained, setContained],
  );
  return (
    <DiffFitContext.Provider value={value}>{children}</DiffFitContext.Provider>
  );
};
