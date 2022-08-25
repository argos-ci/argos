import React from "react";
import { x } from "@xstyled/styled-components";

export const Card = (props) => (
  <x.div borderRadius="md" border={1} borderColor="border" {...props} />
);

export const CardBody = (props) => <x.div p={3} {...props} />;

export const CardText = (props) => <x.p fontSize="sm" {...props} />;

export const CardTitle = (props) => (
  <x.div fontSize="lg" fontWeight="medium" m={0} {...props} />
);

export const CardHeader = (props) => (
  <x.div
    py={2}
    px={3}
    backgroundColor="highlight-background"
    borderRadius="md md 0 0"
    borderBottom={1}
    borderColor="inherit"
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    zIndex={100}
    overflow="scroll"
    {...props}
  />
);

export const CardFooter = (props) => (
  <x.div
    py={2}
    px={3}
    backgroundColor="highlight-background"
    borderRadius="0 0 md md"
    borderTop={1}
    borderColor="inherit"
    color="secondary-text"
    {...props}
  />
);
