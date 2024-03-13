import { createContext, useContext } from "react";
import { DisclosureState } from "ariakit/ts/disclosure";

import { useDialogState } from "@/ui/Dialog";

interface HotkeysDialogContextValue {
  hotkeysDialog: DisclosureState;
}

const HotkeysDialogContext = createContext<HotkeysDialogContextValue | null>(
  null,
);

export const useBuildHotkeysDialogState = () => {
  const context = useContext(HotkeysDialogContext);
  if (context === null) {
    return { hotkeysDialog: null };
  }
  return context;
};

export const BuildHotkeysDialogStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const dialog = useDialogState();
  return (
    <HotkeysDialogContext.Provider value={{ hotkeysDialog: dialog }}>
      {children}
    </HotkeysDialogContext.Provider>
  );
};
