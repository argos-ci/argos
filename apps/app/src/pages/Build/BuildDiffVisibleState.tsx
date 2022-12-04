import { createContext, useContext, useMemo, useState } from "react";

interface DiffVisibleContextValue {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const DiffVisibleContext = createContext<DiffVisibleContextValue | null>(null);

export const useBuildDiffVisibleState = () => {
  const context = useContext(DiffVisibleContext);
  if (context === null) {
    throw new Error(
      "useBuildDiffVisibleState must be used within a BuildDiffVisibleStateProvider"
    );
  }
  return context;
};

export const BuildDiffVisibleStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [visible, setVisible] = useState(true);
  const value = useMemo(
    (): DiffVisibleContextValue => ({ visible, setVisible }),
    [visible, setVisible]
  );
  return (
    <DiffVisibleContext.Provider value={value}>
      {children}
    </DiffVisibleContext.Provider>
  );
};
