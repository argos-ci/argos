import styled from "@xstyled/styled-components";

export const Table = styled.tableBox`
  width: 1;
  border-collapse: collapse;
  text-align: left;
  table-layout: auto !important;
`;

export const Tr = styled.tr`
  border-bottom: 1px solid;
  border-color: light300;
`;

export const Thead = styled.thead`
  background-color: light200;

  ${Tr} {
    border-bottom: 0;
  }
`;

export const Tbody = styled.tbody`
  ${Tr}:hover {
    background-color: light300;
  }
`;

export const Th = styled.thBox`
  padding: 2;
  color: darker;
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
