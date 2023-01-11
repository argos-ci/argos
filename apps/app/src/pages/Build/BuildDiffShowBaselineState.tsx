import { createContext, useContext, useMemo, useState } from "react";

interface DiffShowBaselineContextValue {
  showBaseline: boolean;
  setShowBaseline: React.Dispatch<React.SetStateAction<boolean>>;
}

const DiffShowBaselineContext =
  createContext<DiffShowBaselineContextValue | null>(null);

export const useBuildDiffShowBaselineState = () => {
  const context = useContext(DiffShowBaselineContext);
  if (context === null) {
    throw new Error(
      "useBuildDiffShowBaselineState must be used within a BuildDiffShowBaselineStateProvider"
    );
  }
  return context;
};

export const BuildDiffShowBaselineStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [showBaseline, setShowBaseline] = useState(true);
  const value = useMemo(
    (): DiffShowBaselineContextValue => ({ showBaseline, setShowBaseline }),
    [showBaseline, setShowBaseline]
  );
  return (
    <DiffShowBaselineContext.Provider value={value}>
      {children}
    </DiffShowBaselineContext.Provider>
  );
};
