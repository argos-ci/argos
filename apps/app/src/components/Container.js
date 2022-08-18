import React from "react";
import { x } from "@xstyled/styled-components";

export const Container = (props) => (
  <x.div maxW="container" px={3} mx="auto" {...props} />
);
