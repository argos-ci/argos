import { createContext, useContext, useMemo, useState } from "react";

import { ModalOverlayProps } from "@/ui/Modal";

export type HotkeysDialogState = {
  isOpen: ModalOverlayProps["isOpen"];
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const HotkeysDialogContext = createContext<HotkeysDialogState | null>(null);

export function useBuildHotkeysDialogState() {
  return useContext(HotkeysDialogContext);
}

export function BuildHotkeysDialogStateProvider(props: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, setIsOpen }), [isOpen]);
  return (
    <HotkeysDialogContext.Provider value={value}>
      {props.children}
    </HotkeysDialogContext.Provider>
  );
}
