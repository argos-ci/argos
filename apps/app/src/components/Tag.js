import React from "react";
import { x } from "@xstyled/styled-components";
import { LinkBlock } from "./Link";

export const Tag = (props) => (
  <x.span
    border={1}
    borderColor="border"
    borderRadius="md"
    py={0.5}
    px={2}
    w="fit-content"
    fontSize="sm"
    {...props}
  />
);

export const TagButton = (props) => (
  <Tag
    as={LinkBlock}
    display="flex"
    gap={1}
    alignItems="center"
    cursor="default"
    {...props}
  />
);
