import React from "react";
import {
  useMenuState,
  Menu as AriakitMenu,
  MenuItem as AriakitMenuItem,
  MenuButton as AriakitMenuButton,
  MenuSeparator as AriakitMenuSeparator,
  MenuButtonArrow as AriakitMenuButtonArrow,
} from "ariakit/Menu";
import styled, { x } from "@xstyled/styled-components";
import { Icon } from "./Icon";

export { useMenuState };

const InnerMenuButton = styled.box`
  display: flex;
  align-items: center;
  border-radius: md;
  padding: 1 2;

  &:focus {
    background-color: background-focus;
    outline: none;
  }

  &:hover {
    background-color: background-hover;
    outline: none;
  }

  &[aria-expanded="true"] {
    background-color: background-active;
    outline: none;
  }
`;

export const MenuButton = React.forwardRef(({ children, ...props }, ref) => {
  return (
    <AriakitMenuButton ref={ref} {...props}>
      {(menuProps) => (
        <InnerMenuButton {...menuProps}>{children}</InnerMenuButton>
      )}
    </AriakitMenuButton>
  );
});

export const MenuButtonArrow = (props) => (
  <x.div as={AriakitMenuButtonArrow} {...props} />
);

export const Menu = (props) => (
  <x.menu
    as={AriakitMenu}
    backgroundColor="background"
    border={1}
    borderColor="border"
    borderRadius="md"
    p={1}
    minWidth="110"
    zIndex="1000"
    {...props}
  />
);

export const MenuItem = (props) => (
  <x.div
    as={AriakitMenuItem}
    appearance="none"
    backgroundColor={{
      _: "transparent",
      hover: "background-hover",
      focus: "background-focus",
    }}
    border={0}
    borderRadius="md"
    color="white"
    fontSize="sm"
    w={1}
    transition="md"
    transitionProperty="background-color"
    textDecoration="none"
    display="flex"
    alignItems="center"
    gap="8px"
    outline={{ hover: "none", focus: "none" }}
    p={2}
    fontWeight={600}
    pr={4}
    {...props}
  />
);

export const MenuSeparator = (props) => (
  <x.div
    as={AriakitMenuSeparator}
    borderColor="border"
    my={0.5}
    height={0}
    borderTopWidth="1px"
    {...props}
  />
);

export const MenuText = (props) => (
  <x.div fontSize="sm" my={2} mx={2} fontWeight={600} pr={3} {...props} />
);

export const MenuTitle = (props) => (
  <x.div
    fontSize="sm"
    fontWeight={600}
    color="secondary-text"
    mx={2}
    pr={4}
    {...props}
  />
);

export const MenuIcon = (props) => <Icon w={5} h={5} {...props} />;
