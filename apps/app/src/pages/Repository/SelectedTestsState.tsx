import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface SelectedTestsContextValue {
  selectedTests: Set<string>;
  setSelectedTests: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleTestSelection: (id: string, isSelected: boolean) => void;
}

const SelectedTestsContext = createContext<SelectedTestsContextValue | null>(
  null
);

export const useSelectedTestsState = () => {
  const context = useContext(SelectedTestsContext);
  if (context === null) {
    throw new Error(
      "useSelectedTestsState must be used within a SelectedTestsStateProvider"
    );
  }
  return context;
};

export const SelectedTestsStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  const toggleTestSelection = useCallback((id: string, isSelected: boolean) => {
    setSelectedTests((prevSelectedTests) => {
      const newSelectedTests = new Set(prevSelectedTests);
      if (isSelected) {
        newSelectedTests.add(id);
      } else {
        newSelectedTests.delete(id);
      }
      return newSelectedTests;
    });
  }, []);

  const value = useMemo(
    (): SelectedTestsContextValue => ({
      selectedTests,
      setSelectedTests,
      toggleTestSelection,
    }),
    [selectedTests, toggleTestSelection]
  );

  return (
    <SelectedTestsContext.Provider value={value}>
      {children}
    </SelectedTestsContext.Provider>
  );
};
