import React from "react";
import styled, { x } from "@xstyled/styled-components";
import { useIsMatchingTo } from "../containers/Router";
import { LinkBlock } from "./Link";

export const SidebarList = (props) => (
  <x.ul
    mt={{ _: 0, md: 2 }}
    top={{ _: 0, md: 16 }}
    display="flex"
    flexDirection="column"
    fontWeight="medium"
    fontSize="sm"
    w={{ _: 1, md: 250 }}
    gridColum={1}
    gridRow={{ _: 2, md: "1 / span 2" }}
    position={{ _: "relative", md: "sticky" }}
    alignSelf="flex-start"
    {...props}
  />
);

export const SidebarTitle = ({ children, ...props }) => (
  <x.div
    fontSize="sm"
    color="secondary-text"
    mb={1}
    textTransform="capitalize"
    {...props}
  >
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
    outline: none;
  }

  &[aria-current="true"] {
    color: white;
    background-color: background-active;
    outline: none;
  }
`;

export const SidebarItemLink = (props) => (
  <x.a
    as={LinkBlock}
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
      <SidebarItemLink to={to}>{children}</SidebarItemLink>
    </SidebarItem>
  );
}

export const SidebarLayout = (props) => (
  <x.div
    display="grid"
    gridTemplateColumns={{ _: 1, md: "auto 1fr" }}
    rowGap={4}
    columnGap={12}
    position="relative"
    h="100%"
    {...props}
  />
);

SidebarLayout.PageTitle = (props) => (
  <x.div gridColumn={{ _: 1, md: 2 }} {...props} />
);

SidebarLayout.PageContent = (props) => (
  <x.div gridColumn={{ _: 1, md: 2 }} {...props} />
);
