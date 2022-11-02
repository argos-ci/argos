import { x } from "@xstyled/styled-components";
import { forwardRef } from "react";
import { Link as ReactRouterLink } from "react-router-dom";

export const BaseLink = forwardRef((props, ref) => {
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

export const Link = forwardRef((props, ref) => (
  <BaseLink
    ref={ref}
    textDecoration={{ _: "none", hover: "underline" }}
    color="link"
    cursor="pointer"
    {...props}
  />
));

export const LinkBlock = forwardRef((props, ref) => {
  return (
    <BaseLink
      ref={ref}
      borderRadius="md"
      backgroundColor={{
        _: "inherit",
        hover: props.disabled ? "inherit" : "bg-hover",
      }}
      {...props}
    />
  );
});
