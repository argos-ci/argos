import React from "react";
import styled, { Box, css, up } from "@xstyled/styled-components";
import { Container } from "./Container";
import { FadeLink } from "./Link";

export const Header = styled.header`
  background-color: light200;
  color: darker;
  border-top: 1;
  border-bottom: 1;
  border-color: light300;
`;

export const InnerHeaderBreadcrumb = styled.menu`
  margin: 0 -2;
  padding: 0;
  font-weight: 300;
  display: flex;
  align-items: center;
  flex: 1;
  font-size: 18;
  margin-bottom: 2;
  flex-wrap: wrap;

  ${up(
    "md",
    css`
      font-size: 24;
      margin-bottom: 0;
    `
  )}
`;

export const HeaderBreadcrumbItem = styled.li`
  margin: 0 2;
  color: darker;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  grid-gap: 2;
`;

export const HeaderBreadcrumb = ({ children, ...props }) => {
  if (!children) return null;

  return (
    <InnerHeaderBreadcrumb {...props}>
      {React.Children.map(children, (child, index) => (
        <>
          {index !== 0 && (
            <Box color="light500" fontSize={25} mt={-1} mx={1}>
              /
            </Box>
          )}
          {React.isValidElement(child) ? React.cloneElement(child) : child}
        </>
      ))}
    </InnerHeaderBreadcrumb>
  );
};

export const HeaderBreadcrumbLink = styled.aBox`
  display: flex;
  align-items: center;
  grid-gap: 2;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

export const HeaderPrimary = styled.div`
  display: flex;
  flex-direction: column;
  margin: 3 0;

  ${up(
    "md",
    css`
      flex-direction: row;
      align-items: center;
      margin: 4 0;
    `
  )}
`;

export const HeaderSecondaryLink = styled(FadeLink)`
  margin-top: 2;
  font-size: 14;
  display: flex;
  align-items: center;
  color: darker;
`;

export const HeaderBody = Container;
