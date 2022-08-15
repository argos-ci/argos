import React from "react";
import {
  useMenuState,
  Menu as ReakitMenu,
  MenuItem as ReakitMenuItem,
  MenuDisclosure as ReakitMenuDisclosure,
} from "reakit/Menu";
import styled from "@xstyled/styled-components";

export { useMenuState };

const InnerMenuDisclosure = styled.box`
  display: flex;
  align-items: center;
  border-radius: base;
  padding: 1 2;
  cursor: pointer;

  &:focus,
  &:hover,
  &[aria-expanded="true"] {
    background-color: light300;
    outline: none;
  }
`;

export const MenuDisclosure = React.forwardRef(
  ({ children, ...props }, ref) => {
    return (
      <ReakitMenuDisclosure ref={ref} {...props}>
        {(menuProps) => (
          <InnerMenuDisclosure {...menuProps}>{children}</InnerMenuDisclosure>
        )}
      </ReakitMenuDisclosure>
    );
  }
);

const InnerMenu = styled.div`
  background-color: light100;
  border-radius: base;
  padding: 2 1;
  min-width: 110;
  z-index: 1000;
  border: solid 1px black;

  &:focus {
    outline: none;
  }
`;

export const Menu = React.forwardRef(({ children, ...props }, ref) => {
  return (
    <ReakitMenu ref={ref} {...props}>
      {(menuProps) => <InnerMenu {...menuProps}>{children}</InnerMenu>}
    </ReakitMenu>
  );
});

const InnerMenuItem = styled.buttonBox`
  appearance: none;
  background-color: transparent;
  padding: 2;
  border: 0;
  border-radius: base;
  color: darker;
  font-size: 14;
  display: block;
  width: 100%;
  text-align: left;
  transition: base;
  transition-property: background-color;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  grid-gap: 2;

  &:focus,
  &:hover {
    outline: none;
    background-color: light200;
  }
`;

export const MenuItem = React.forwardRef(function MenuItem(props, ref) {
  return <ReakitMenuItem ref={ref} as={InnerMenuItem} {...props} />;
});
