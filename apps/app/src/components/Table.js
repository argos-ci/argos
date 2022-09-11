import * as React from "react";
import styled, { x } from "@xstyled/styled-components";

export const Table = (props) => (
  <x.div w={1} borderCollapse="collapse" display="table" {...props} />
);

export const Tr = styled.box`
  border-bottom: 1;
  border-color: border;
  display: table-row;
`;

export const Thead = styled.box`
  background-color: highlight-background;
  display: table-header-group;

  ${Tr} {
    border-bottom: 0;
  }
`;

export const Tbody = styled.box`
  display: table-row-group;
`;

export const Th = styled.box`
  padding: 5;
  font-weight: 500;
  display: table-cell;

  &:first-of-type {
    padding-left: 4;
  }
  &:last-of-type {
    padding-right: 4;
  }
`;

export const Td = styled.box`
  padding: 3 5;
  font-weight: 500;
  display: table-cell;

  &:first-of-type {
    padding-left: 4;
  }
  &:last-of-type {
    padding-right: 4;
  }
`;
