import { x } from "@xstyled/styled-components";
import { forwardRef } from "react";

export const Badge = forwardRef(({ children, ...props }, ref) => {
  if (!children) return null;

  return (
    <x.div
      ref={ref}
      py={0.5}
      px={2}
      border={1}
      fontWeight="semibold"
      color="primary-text"
      borderColor="layout-border"
      fontSize={10}
      lineHeight={1}
      display="flex"
      justifyContent="center"
      borderRadius="lg"
      {...props}
    >
      {children}
    </x.div>
  );
});
