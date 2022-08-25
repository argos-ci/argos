import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Loader } from "./Loader";
import { getStatusColor } from "../containers/Status";

export const Alert = React.forwardRef(
  ({ children, severity = "neutral", ...props }, ref) => {
    const baseColor = getStatusColor(severity);

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
        role="alert"
        {...props}
      >
        {children}
      </x.div>
    );
  }
);

export function LoadingAlert({ children, ...props }) {
  return (
    <Alert w="fit-content" mx="auto" aria-busy {...props}>
      <x.div display="flex" gap={2} alignItems="center" w="fit-content">
        {children || "Argos is fetching data..."}
        <Loader />
      </x.div>
    </Alert>
  );
}
