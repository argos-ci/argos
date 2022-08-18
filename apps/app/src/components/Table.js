import React from "react";
import styled, { x } from "@xstyled/styled-components";

export const Table = (props) => (
  <x.table w={1} borderCollapse="collapse" textAlign="left" {...props} />
);

export const Tr = styled.tr`
  border-bottom: 1px solid;
  border-color: border;
`;

export const Thead = styled.thead`
  background-color: highlight-background;

  ${Tr} {
    border-bottom: 0;
  }
`;

export const Tbody = styled.tbody``;

export const Th = styled.thBox`
  padding: 2;
  font-weight: 500;

  &:first-of-type {
    padding-left: 4;
  }
  &:last-of-type {
    padding-right: 4;
  }
`;

export const Td = styled.tdBox`
  padding: 2;
  font-weight: 500;

  &:first-of-type {
    padding-left: 4;
  }
  &:last-of-type {
    padding-right: 4;
  }
`;
