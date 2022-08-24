import React from "react";
import { x } from "@xstyled/styled-components";

const InnerCode = (props) => (
  <x.div p={2} backgroundColor="gray-800" borderRadius="md" {...props} />
);

export function Code({ children, ...props }) {
  return (
    <InnerCode {...props}>
      <x.pre overflowX="auto">{children}</x.pre>
    </InnerCode>
  );
}
