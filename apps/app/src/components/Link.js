import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Link as ReactRouterLink } from "react-router-dom";

export const BaseLink = (props) => (
  <x.a
    transition="base"
    as={props.to ? ReactRouterLink : "a"}
    textDecoration={{ _: "none", hover: "none" }}
    {...(props.target === "_blank" ? { rel: "noopener noreferrer" } : {})}
    {...props}
  />
);

export const Link = ({ ...props }) => (
  <BaseLink
    textDecoration={{ _: "none", hover: "underline", focus: "underline" }}
    color="link"
    cursor="pointer"
    {...props}
  />
);

export function LinkBlock(props) {
  return (
    <BaseLink
      borderRadius="md"
      backgroundColor={{
        _: "inherit",
        hover: "background-hover",
        focus: "background-focus",
      }}
      {...props}
    />
  );
}
