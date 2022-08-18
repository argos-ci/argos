import React from "react";
import { Link, NavLink } from "react-router-dom";
import styled, { css, up } from "@xstyled/styled-components";
import { useIsMatchingTo } from "../containers/Router";

export const TabList = styled.menu`
  padding: 0;
  margin: 0;
  margin-bottom: -1rpx;
  list-style-type: none;
  display: flex;
  font-weight: medium;
  font-size: sm;
`;

export const TabItem = styled.li`
  padding: 0;
  margin: 0;
  border-bottom: 1;
  border-color: transparent;
  transition: base;
  transition-property: border-color;

  &[aria-current="true"] {
    border-color: white;
  }
`;

export const TabItemLink = styled(NavLink)`
  color: white;
  text-decoration: none;
  padding: 2 3;
  display: block;
  overflow-x: auto;

  ${up(
    "md",
    css`
      padding: 3;
      overflow-x: visible;
    `
  )}
`;

export function TabNavLink({ children, to, exact, ...props }) {
  const isActive = useIsMatchingTo({ to, exact });

  return (
    <TabItem aria-current={isActive}>
      <TabItemLink as={Link} to={to} {...props}>
        {children}
      </TabItemLink>
    </TabItem>
  );
}
