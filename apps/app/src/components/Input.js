import * as React from "react";
import { x } from "@xstyled/styled-components";

export const Input = React.forwardRef((props, ref) => (
  <x.input
    ref={ref}
    borderRadius="md"
    lineHeight="16px"
    color="primary-text"
    border={1}
    borderColor="border"
    w={1}
    py={2}
    px={4}
    mt={1}
    h={9}
    backgroundColor={{ _: "bg", hover: "bg-hover" }}
    {...props}
  />
));
