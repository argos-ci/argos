import { forwardRef } from "react";
import { x } from "@xstyled/styled-components";

export const ControlButton = forwardRef(
  ({ variant = "success", ...props }, ref) => (
    <x.div
      w="12px"
      h="12px"
      borderRadius="full"
      bg={variant}
      ref={ref}
      {...props}
    />
  )
);

export const ControlButtons = ({ closeButtonRef, ...props }) => (
  <x.div
    display="flex"
    alignItems="center"
    gap="8px"
    pl="12px"
    pr="8px"
    position="absolute"
    {...props}
  >
    <ControlButton variant="danger" ref={closeButtonRef} />
    <ControlButton variant="warning" />
    <ControlButton variant="success" />
  </x.div>
);
