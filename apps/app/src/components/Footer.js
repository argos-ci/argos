import React from "react";
import styled, { css, up } from "@xstyled/styled-components";
import { Container } from "./Container";
import { BaseLink } from "./Link";

export const Footer = styled.div`
  background-color: highlight-background;
  color: white;
  border-top: 1;
  border-color: border;
  font-size: xs;
`;

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

export const FooterPrimary = styled.div`
  margin-bottom: 2;
  display: flex;

  ${up(
    "md",
    css`
      margin-bottom: 0;
    `
  )}
`;
export const FooterSecondary = styled.div`
  margin: 0 -2;
`;
export function FooterLink(props) {
  return <BaseLink mx={2} color="white" {...props} />;
}
