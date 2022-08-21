import React from "react";
import { x } from "@xstyled/styled-components";
import { Link } from "./Link";

export const DocumentationLinkPhrase = (props) => {
  return (
    <x.span {...props}>
      {" "}
      Read our documentation for more information about{" "}
      <Link target="_blank" href="https://docs.argos-ci.com">
        installing
      </Link>{" "}
      Argos and{" "}
      <Link target="_blank" href="https://docs.argos-ci.com/usage">
        using it
      </Link>
      .
    </x.span>
  );
};
