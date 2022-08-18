import React from "react";
import { x } from "@xstyled/styled-components";

export const PrimaryTitle = (props) => (
  <x.h1 fontSize="3xl" fontWeight="medium" mb={3} {...props} />
);

export const SecondaryTitle = (props) => (
  <x.h2 fontSize="xl" fontWeight="medium" mb={2} {...props} />
);
