import * as React from "react";
import { x } from "@xstyled/styled-components";

export const Badge = React.forwardRef(
  ({ children, variant = "primary", ...props }, ref) => {
    const onColor = `badge-${variant}-on`;
    const bgColor = `badge-${variant}-bg`;

    if (!children) return null;

    return (
      <x.div
        ref={ref}
        px={2}
        py={1}
        border={1}
        fontWeight={600}
        color={onColor}
        backgroundColor={bgColor}
        borderColor={variant === "secondary" ? "layout-border" : bgColor}
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
  }
);
