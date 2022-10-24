import * as React from "react";
import { x } from "@xstyled/styled-components";

export const Tag = (props) => (
  <x.span
    border={1}
    borderColor="border"
    borderRadius="md"
    py={1}
    px={2}
    w="fit-content"
    fontSize="sm"
    fontWeight="medium"
    {...props}
  />
);

export const TagButton = (props) => (
  <Tag display="flex" gap={1} alignItems="center" {...props} />
);
