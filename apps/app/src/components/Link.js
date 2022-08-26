import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Link as ReactRouterLink } from "react-router-dom";

export const BaseLink = React.forwardRef((props, ref) => {
  return (
    <x.a
      ref={ref}
      transition="base"
      as={props.to != undefined ? ReactRouterLink : "a"}
      textDecoration={{ _: "none", hover: "none" }}
      {...(props.target === "_blank" ? { rel: "noopener noreferrer" } : {})}
      {...props}
    />
  );
});

export const Link = React.forwardRef((props, ref) => (
  <BaseLink
    ref={ref}
    textDecoration={{ _: "none", hover: "underline" }}
    color="link"
    cursor="pointer"
    {...props}
  />
));

export const LinkBlock = React.forwardRef((props, ref) => {
  return (
    <BaseLink
      ref={ref}
      borderRadius="md"
      backgroundColor={{
        _: "inherit",
        hover: "background-hover",
      }}
      {...props}
    />
  );
});
