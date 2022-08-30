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
        role="alert"
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

export function LoadingAlert({ children, delay = 300, ...props }) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <Alert
      mx="auto"
      aria-busy="true"
      style={!visible ? { visibility: "hidden" } : undefined}
      display="flex"
      alignItems="center"
      gap={2}
      w="fit-content"
      {...props}
    >
      <div>{children || "Argos is fetching data"}</div>
      <Loader />
    </Alert>
  );
}
