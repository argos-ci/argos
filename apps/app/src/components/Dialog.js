import { XMarkIcon } from "@heroicons/react/24/solid";
import { x } from "@xstyled/styled-components";
import {
  Dialog as AriakitDialog,
  DialogDismiss as AriakitDialogDismiss,
  useDialogState,
} from "ariakit/dialog";
import { forwardRef } from "react";

import { IconButton } from ".";

export { useDialogState };

export const DialogHeader = ({ children, ...props }) => (
  <x.div
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    {...props}
  >
    {children}
  </x.div>
);

export const DialogDismiss = () => {
  return (
    <AriakitDialogDismiss
      as={IconButton}
      icon={XMarkIcon}
      fontSize="default"
      mt={-1}
    />
  );
};

export const Dialog = forwardRef(({ children, ...props }, ref) => {
  return (
    <AriakitDialog ref={ref} {...props}>
      {(dialogProps) => (
        <x.div
          {...dialogProps}
          w={416}
          p={4}
          borderRadius="md"
          boxShadow="dialog"
          fontSize="sm"
          lineHeight="16px"
          border={1}
          borderColor="tooltip-border"
          backgroundColor="tooltip-bg"
          top="50%"
          left="50%"
          zIndex={300}
          overflow="auto"
          display="flex"
          gap={6}
          flexDirection="column"
          width={1}
          height="fit-content"
          maxWidth="calc(100% - 1rem * 2)"
          maxHeight="calc(100% - 1rem * 2)"
        >
          {children}
        </x.div>
      )}
    </AriakitDialog>
  );
});
