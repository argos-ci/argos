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
    textDecoration="none"
    {...props}
  />
);

export const TagButton = (props) => (
  <Tag
    as={LinkBlock}
    backgroundColor={{ _: "gray-700-a70" }}
    color={{ _: "inherit", hover: "primary-text" }}
    display="flex"
    gap={1}
    alignItems="center"
    {...props}
  />
);