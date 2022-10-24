import * as React from "react";
import { x } from "@xstyled/styled-components";

export const Banner = React.forwardRef(
  ({ children, color = "neutral", ...props }, ref) => {
    const onColor = `${color}-on`;
    const bgColor = `${color}-bg`;

    if (!children) return null;

    return (
      <x.div
        ref={ref}
        role="alert"
        p={4}
        borderBottom={1}
        fontWeight="medium"
        color={onColor}
        backgroundColor={bgColor}
        borderColor="layout-border"
        fontSize="base"
        lineHeight={1}
        display="flex"
        justifyContent="center"
        gap={1}
        {...props}
      >
        {children}
      </x.div>
    );
  }
);
