import React from "react";
import { x } from "@xstyled/styled-components";
import { Link } from "../components/Link";

export const DocumentationPhrase = (props) => {
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
