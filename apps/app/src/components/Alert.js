import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Loader } from "./Loader";

export const Alert = React.forwardRef(
  ({ children, color = "neutral", ...props }, ref) => {
    const onColor = `${color}-on`;
    const bgColor = `${color}-bg`;

    if (!children) return null;

    return (
      <x.div
        ref={ref}
        role="alert"
        py={2}
        px={4}
        borderRadius="lg"
        border={1}
        fontWeight="medium"
        color={onColor}
        backgroundColor={bgColor}
        borderColor={bgColor}
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
      data-visual-test="transparent"
      {...props}
    >
      <div>{children || "Argos is fetching data"}</div>
      <Loader />
    </Alert>
  );
}
