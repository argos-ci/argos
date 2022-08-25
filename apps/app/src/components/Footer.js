import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Container } from "./Container";
import { BaseLink } from "./Link";

export const Footer = (props) => (
  <x.div
    backgroundColor="highlight-background"
    borderTop={1}
    borderColor="border"
    fontSize="sm"
    {...props}
  />
);

export function FooterBody(props) {
  return (
    <Container
      p={3}
      display="flex"
      flexDirection={{ _: "column", md: "row" }}
      justifyContent="space-between"
      alignItems="center"
      {...props}
    />
  );
}

export const FooterPrimary = (props) => (
  <x.div mb={{ _: 2, md: 0 }} display="flex" {...props} />
);

export const FooterSecondary = (props) => (
  <x.div display="flex" gap={3} {...props} />
);

export function FooterLink(props) {
  return <BaseLink {...props} />;
}
