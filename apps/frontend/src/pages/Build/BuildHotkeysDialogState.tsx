import { createContext, use, useMemo, useState } from "react";

import { ModalProps } from "@/ui/Modal";

export type HotkeysDialogState = {
  isOpen: ModalProps["isOpen"];
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const HotkeysDialogContext = createContext<HotkeysDialogState | null>(null);

export function useBuildHotkeysDialogState() {
  return use(HotkeysDialogContext);
}

export function BuildHotkeysDialogStateProvider(props: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, setIsOpen }), [isOpen]);
  return (
    <HotkeysDialogContext value={value}>{props.children}</HotkeysDialogContext>
  );
}
