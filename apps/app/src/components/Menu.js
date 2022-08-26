import * as React from "react";
import {
  useMenuState,
  Menu as AriakitMenu,
  MenuItem as AriakitMenuItem,
  MenuButton as AriakitMenuButton,
  MenuSeparator as AriakitMenuSeparator,
  MenuButtonArrow as AriakitMenuButtonArrow,
} from "ariakit/menu";
import styled, { x, css } from "@xstyled/styled-components";
import { Icon } from "./Icon";

export { useMenuState };

const InnerMenuButton = styled.box`
  display: flex;
  align-items: center;
  border-radius: md;
  padding: 1 2;

  &:focus {
    background-color: background-focus;
  }

  &:hover {
    background-color: background-hover;
  }

  &[aria-expanded="true"] {
    background-color: background-active;
  }

  ${(p) =>
    p.$shape === "square" &&
    css`
      padding: 1;
    `}
`;

export const MenuButton = React.forwardRef(
  ({ children, shape, ...props }, ref) => {
    return (
      <AriakitMenuButton ref={ref} {...props}>
        {(menuProps) => (
          <InnerMenuButton {...menuProps} $shape={shape}>
            {children}
          </InnerMenuButton>
        )}
      </AriakitMenuButton>
    );
  }
);

export const MenuButtonArrow = ({ as, ...props }) => {
  return <x.div as={AriakitMenuButtonArrow} {...props} />;
};

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

export const MenuItem = ({ as, children, ...props }) => {
  return (
    <AriakitMenuItem {...props}>
      {(menuItemProps) => (
        <x.div
          as={as}
          appearance="none"
          backgroundColor={{
            _: "transparent",
            hover: "background-hover",
            focus: "background-focus",
          }}
          border={0}
          borderRadius="md"
          color="primary-text"
          fontSize="sm"
          w={1}
          transition="md"
          transitionProperty="background-color"
          textDecoration="none"
          display="flex"
          alignItems="center"
          gap="8px"
          p={2}
          fontWeight={600}
          pr={4}
          userSelect="none"
          {...menuItemProps}
        >
          {children}
        </x.div>
      )}
    </AriakitMenuItem>
  );
};

export const MenuSeparator = (props) => (
  <x.div
    as={AriakitMenuSeparator}
    borderColor="border"
    my={1}
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

export const MenuIcon = (props) => <Icon size={24} w={5} h={5} {...props} />;
