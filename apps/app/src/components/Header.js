import { x } from "@xstyled/styled-components";

import { Container } from "./Container";
import { BaseLink } from "./Link";

export const Header = (props) => (
  <x.header
    backgroundColor="highlight-background"
    borderTop={1}
    borderBottom={1}
    borderColor="border"
    {...props}
  />
);

export const HeaderPrimary = (props) => (
  <x.div
    display="flex"
    flexDirection={{ _: "column", md: "row" }}
    alignItems={{ _: "inherit", md: "center" }}
    my={{ _: 3, md: 4 }}
    {...props}
  />
);

export const HeaderSecondaryLink = (props) => (
  <x.a
    as={BaseLink}
    mt={2}
    fontSize="sm"
    display="flex"
    alignItems="center"
    {...props}
  />
);

export const HeaderBody = Container;
