import React from "react";
import { x } from "@xstyled/styled-components";
import { getVariantColor } from "../modules/utils";

export const Alert = React.forwardRef(
  ({ children, severity = "neutral", ...props }, ref) => {
    const baseColor = getVariantColor(severity);

    if (!children) return null;

    return (
      <x.div
        ref={ref}
        border={1}
        py={2}
        px={4}
        borderRadius="lg"
        fontWeight={500}
        borderColor={`${baseColor}-500-a60`}
        backgroundColor={`${baseColor}-900-a20`}
        color={`${baseColor}-400`}
        {...props}
      >
        {children}
      </x.div>
    );
  }
);
