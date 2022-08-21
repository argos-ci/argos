import React from "react";
import { x } from "@xstyled/styled-components";
import { Link as ReactRouterLink } from "react-router-dom";

export const BaseLink = (props) => (
  <x.a
    transition="base"
    cursor="pointer"
    as={props.to ? ReactRouterLink : "a"}
    outline={{ focus: "none" }}
    textDecoration={{ _: "none", hover: "none" }}
    {...props}
  />
);

export const Link = ({ ...props }) => (
  <BaseLink
    textDecoration={{ _: "none", hover: "underline", focus: "underline" }}
    color="link"
    {...props}
  />
);

export const FadeLink = (props) => (
  <BaseLink color="inherit" opacity={{ hover: 0.7 }} {...props} />
);

export const IconLink = ({ icon: Icon, children, ...props }) => (
  <Link {...props}>
    {children}
    <x.svg as={Icon} mt="-3px" mx={1} display="inline-block" w={3} h={3} />
  </Link>
);
