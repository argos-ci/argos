import React from "react";
import styled from "@xstyled/styled-components";
import { Link as ReactRouterLink } from "react-router-dom";

export const FadeLink = styled.aBox`
  transition: base;
  text-decoration: none;
  color: inherit;

  &:hover {
    opacity: 0.75;
  }
`;

const InnerLink = styled.aBox`
  transition: base;
  text-decoration: none;
  color: #3291ff;

  &:hover {
    text-decoration: underline;
  }
`;

export const Link = (props) => {
  return props.to ? (
    <InnerLink as={ReactRouterLink} {...props} />
  ) : (
    <InnerLink {...props} />
  );
};
