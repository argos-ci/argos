import * as React from "react";
import { x } from "@xstyled/styled-components";

const InnerCode = (props) => (
  <x.div p={2} backgroundColor="code-background" borderRadius="md" {...props} />
);

export const InlineCode = (props) => (
  <x.pre
    backgroundColor="code-background"
    borderRadius="md"
    fontWeight={500}
    px={1}
    w="fit-content"
    display="inline-block"
    fontSize="sm"
    {...props}
  />
);

export function Code({ children, ...props }) {
  return (
    <InnerCode {...props}>
      <x.pre overflowX="auto">{children}</x.pre>
    </InnerCode>
  );
}
