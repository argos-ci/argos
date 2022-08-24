import React from "react";
import { x } from "@xstyled/styled-components";
import { LinkBlock } from "./Link";

export const BreadcrumbSeparator = (props) => (
  <x.span color="secondary-text" fontSize="2xl" mt={-1} {...props}>
    /
  </x.span>
);

export const BreadcrumbItemMenu = (props) => <x.div {...props} />;

export const BreadcrumbLink = (props) => (
  <x.a
    as={LinkBlock}
    display="flex"
    alignItems="center"
    textDecoration="none"
    px={1}
    gap={2}
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
