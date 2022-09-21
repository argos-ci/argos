import * as React from "react";
import { x } from "@xstyled/styled-components";
import { ChevronRightIcon } from "@primer/octicons-react";
import { Disclosure, DisclosureContent } from "./Disclosure";
import { LinkBlock } from "./Link";
import { Card, CardBody, CardHeader, CardTitle } from "./Card";

export const CollapseCardHeader = ({ state, ...props }) => (
  <CardHeader borderBottom={state.open ? 1 : 0} {...props} />
);

const CollapseCardDisclosure = ({ state }) => (
  <LinkBlock as={Disclosure} state={state} px={1} color="secondary-text">
    <x.div
      as={ChevronRightIcon}
      transform
      rotate={state.open ? 90 : 0}
      transitionDuration={300}
      w={4}
      h={4}
    />
  </LinkBlock>
);

export const CollapseCardTitle = ({ state, children, ...props }) => (
  <CardTitle
    display="flex"
    alignItems="center"
    gap={1}
    fontSize="sm"
    {...props}
  >
    <CollapseCardDisclosure state={state} />
    {children}
  </CardTitle>
);

export const CollapseCardBody = ({ state, ...props }) => (
  <DisclosureContent state={state}>
    <CardBody {...props} />
  </DisclosureContent>
);

export const CollapseCard = Card;
