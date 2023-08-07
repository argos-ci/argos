import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { Test } from "@/gql/graphql";

interface SelectedTestsContextValue {
  selectedTests: Test[];
  selectedTestIds: string[];
  clearTestSelection: () => void;
  toggleTestSelection: (test: Test, isSelected: boolean) => void;
  testIsSelected: (test: Test) => boolean;
  onlyFlakySelected: boolean;
}

const SelectedTestsContext = createContext<SelectedTestsContextValue | null>(
  null,
);

export const useSelectedTestsState = () => {
  const context = useContext(SelectedTestsContext);
  if (context === null) {
    throw new Error(
      "useSelectedTestsState must be used within a SelectedTestsStateProvider",
    );
  }
  return context;
};

export const SelectedTestsStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedTests, setSelectedTests] = useState<Set<Test>>(new Set());

  const toggleTestSelection = useCallback((test: Test, isSelected: boolean) => {
    setSelectedTests((prevSelectedTests) => {
      const newSelectedTests = new Set(prevSelectedTests);
      if (isSelected) {
        newSelectedTests.add(test);
      } else {
        newSelectedTests.delete(test);
      }
      return newSelectedTests;
    });
  }, []);

  const selectedTestsArray = useMemo(
    () => Array.from(selectedTests),
    [selectedTests],
  );

  const value = useMemo(
    (): SelectedTestsContextValue => ({
      selectedTests: selectedTestsArray,
      selectedTestIds: selectedTestsArray.map((test) => test.id),
      clearTestSelection: () => setSelectedTests(new Set()),
      toggleTestSelection,
      testIsSelected: (test) => selectedTests.has(test),
      onlyFlakySelected:
        selectedTestsArray.length > 0 &&
        selectedTestsArray.every((test: Test) => test.status === "flaky"),
    }),
    [selectedTests, toggleTestSelection, selectedTestsArray],
  );

  return (
    <SelectedTestsContext.Provider value={value}>
      {children}
    </SelectedTestsContext.Provider>
  );
};
