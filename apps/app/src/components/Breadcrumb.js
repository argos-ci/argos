import React from "react";
import { x } from "@xstyled/styled-components";
import { BaseLink } from "./Link";

export const BreadcrumbSeparator = (props) => (
  <x.span color="secondary-text" fontSize="2xl" mt={-1} {...props}>
    /
  </x.span>
);

export const BreadcrumbItemMenu = (props) => <x.div {...props} />;

export const BreadcrumbLink = (props) => (
  <x.a
    as={BaseLink}
    display="flex"
    alignItems="center"
    textDecoration="none"
    borderRadius="md"
    px={1}
    py={1}
    gap={2}
    backgroundColor={{ hover: "background-hover", focus: "background-focus" }}
    {...props}
  />
);

export const BreadcrumbItem = (props) => (
  <x.li mx={1} display="flex" alignItems="center" flexShrink={0} {...props} />
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
