import * as React from "react";
import { x } from "@xstyled/styled-components";

export const PrimaryTitle = (props) => (
  <x.h1 fontSize={{ _: "2xl", md: "3xl" }} mb={3} {...props} />
);

export const SecondaryTitle = (props) => (
  <x.h2
    fontSize={{ _: "lg", md: "xl" }}
    fontWeight="medium"
    mb={2}
    {...props}
  />
);
