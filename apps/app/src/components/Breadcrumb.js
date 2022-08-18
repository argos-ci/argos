import React from "react";
import { x } from "@xstyled/styled-components";
import { Link as ReactRouterLink } from "react-router-dom";

export const BreadcrumbSeparator = (props) => (
  <x.span color="secondary-text" fontSize="2xl" mt={-1} {...props}>
    /
  </x.span>
);

export const BreadcrumbItemMenu = (props) => <x.div ml={-2} {...props} />;

export const BreadcrumbLink = (props) => (
  <x.a
    as={ReactRouterLink}
    display="flex"
    alignItems="center"
    textDecoration="none"
    cursor="pointer"
    borderRadius="md"
    px={2}
    py={1}
    gap={2}
    backgroundColor={{ hover: "background-hover" }}
    {...props}
  />
);

export const BreadcrumbItem = (props) => (
  <x.li
    mx={2}
    display="flex"
    alignItems="center"
    flexShrink={0}
    gap={2}
    minH={{ _: "35px", md: "42px" }}
    {...props}
  />
);

export const Breadcrumb = (props) => (
  <x.menu
    mx={-2}
    padding="0"
    fontWeight={300}
    display="flex"
    alignItems="center"
    flex={1}
    fontSize={{ _: "lg", md: "2xl" }}
    mb={{ _: 2, md: 0 }}
    flexWrap="wrap"
    {...props}
  />
);
