import * as React from "react";
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
    px={2}
    gap={2}
    minHeight="28px"
    {...props}
  />
);

export const BreadcrumbItem = (props) => (
  <x.li display="flex" alignItems="center" flexShrink={0} gap={1} {...props} />
);

export const Breadcrumb = (props) => (
  <nav aria-label="Breadcrumb">
    <x.ol
      text={{ _: "lg", md: "1xl" }}
      fontWeight="light"
      display="flex"
      flexWrap="wrap"
      alignItems="center"
      gap={2}
      {...props}
    />
  </nav>
);
