import * as React from "react";
import { x } from "@xstyled/styled-components";

const InnerCode = (props) => (
  <x.div p={2} backgroundColor="code-background" borderRadius="md" {...props} />
);

export const InlineCode = (props) => (
  <x.pre
    backgroundColor="code-background"
    color="primary-text"
    borderRadius="inlineCode"
    fontWeight="normal"
    fontSize="xs"
    lineHeight={1}
    p={1}
    w="fit-content"
    display="inline-block"
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
