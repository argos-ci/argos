import React from "react";
import { Link, Route } from "react-router-dom";
import styled, { css, up } from "@xstyled/styled-components";

export const SidebarList = styled.ulBox`
  padding: 0;
  margin: 0 0 3;
  list-style-type: none;
  display: flex;
  flex-direction: column;
  font-weight: medium;
  font-size: 14;
  width: 1;

  ${up(
    "sm",
    css`
      width: 300px;
    `
  )}
`;

export const SidebarItem = styled.li`
  padding: 0;
  margin: 0;
  transition: base;
  color: light500;
  border-radius: base;

  &:hover {
    color: darker;
    background-color: light200;
  }

  &[aria-current="true"] {
    color: darker;
    background-color: light300;
  }
`;

export const SidebarItemLink = styled.a`
  text-decoration: none;
  padding: 0;
  display: block;
  overflow-x: auto;
  padding: 2 2 2;

  ${up(
    "md",
    css`
      padding: 2;
      overflow-x: visible;
    `
  )}
`;

export function RouterSidebarItem({ children, exact, to }) {
  return (
    <Route exact={exact} path={to}>
      {({ match }) => (
        <SidebarItem aria-current={Boolean(match)}>
          <SidebarItemLink as={Link} to={to}>
            {children}
          </SidebarItemLink>
        </SidebarItem>
      )}
    </Route>
  );
}
