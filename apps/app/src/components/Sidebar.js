import React from "react";
import { Link } from "react-router-dom";
import styled, { x } from "@xstyled/styled-components";
import { useIsMatchingTo } from "../containers/Router";

export const SidebarList = (props) => (
  <x.ul
    mt={0}
    display="flex"
    flexDirection="column"
    fontWeight="medium"
    fontSize="sm"
    w={{ _: 1, md: 250 }}
    gridColum={1}
    gridRow={{ _: 2, md: "1 / span 2" }}
    {...props}
  />
);

export const SidebarTitle = ({ children, ...props }) => (
  <x.div fontSize="sm" color="secondary-text" mb={1} {...props}>
    {children}
    <x.hr mt={1} h="1px" bg="border" w={1} />
  </x.div>
);

export const SidebarItem = styled.li`
  padding: 0;
  margin: 0;
  transition: base;
  color: gray-200;
  border-radius: md;

  &:hover {
    color: white;
    background-color: background-hover;
  }

  &[aria-current="true"] {
    color: white;
    background-color: background-active;
  }
`;

export const SidebarItemLink = (props) => (
  <x.a
    textDecoration="none"
    display="block"
    overflowX={{ _: "auto", md: "visible" }}
    p={2}
    {...props}
  />
);

export function SidebarNavLink({ children, to, exact }) {
  const isActive = useIsMatchingTo({ to, exact });

  return (
    <SidebarItem aria-current={isActive}>
      <SidebarItemLink as={Link} to={to}>
        {children}
      </SidebarItemLink>
    </SidebarItem>
  );
}

export const SidebarLayout = (props) => (
  <x.div
    display="grid"
    gridTemplateColumns={{ _: 1, md: "auto 1fr" }}
    rowGap={6}
    columnGap={12}
    {...props}
  />
);

SidebarLayout.PageTitle = (props) => (
  <x.div gridColumn={{ _: 1, md: 2 }} mb={-4} {...props} />
);

SidebarLayout.PageContent = (props) => (
  <x.div gridColumn={{ _: 1, md: 2 }} {...props} />
);
