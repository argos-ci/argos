import { useState, useEffect, useRef } from "react";
import styled, { css, up, x } from "@xstyled/styled-components";
import { Dialog, DialogDisclosure, useDialogState } from "ariakit/dialog";
import { Burger } from "./Burger";
import { Container } from "./Container";
import { Link } from "./Link";

import type { DialogState } from "ariakit/dialog";

export const Nav = styled.nav<{ $scrolled: boolean }>`
  background-color: lighter;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 1;
  backdrop-filter: saturate(180%) blur(5px);
  padding: 3 0;
  font-size: sm;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease-in-out;

  ${up(
    "md",
    css`
      background-color: transparent;
    `
  )};

  ${(p) =>
    p.$scrolled &&
    css`
      border-bottom-color: layout-border;
    `}
`;

export const NavbarSecondary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <x.div
    display={{ _: "none", md: "flex" }}
    flex={1}
    alignItems="center"
    justifyContent="flex-end"
    gap={{ md: 8 }}
  >
    {children}
  </x.div>
);

export const NavbarLink: React.FC<{
  href: string;
  children: React.ReactNode;
}> = (props) => (
  <Link
    display="block"
    color={{ _: "darker", hover: "on-light", focus: "on-light" }}
    outline="none"
    py={3}
    {...props}
  />
);

const MobileMenuContainer = styled(Container)`
  position: fixed;
  background-color: lighter;
  top: 68px;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  overflow: auto;
  padding: 6;

  display: flex;
  flex-direction: column;
  gap: 3;

  ${up(
    "md",
    css`
      display: none;
    `
  )}
`;

interface MobileMenuProps {
  children: React.ReactNode;
  dialog: DialogState;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ children, dialog }) => {
  return (
    <Dialog
      onClick={(event) => {
        if ((event.target as HTMLElement).tagName === "A") {
          dialog.hide();
        }
      }}
      aria-label="Menu"
      state={dialog}
    >
      <MobileMenuContainer>{children}</MobileMenuContainer>
    </Dialog>
  );
};

interface NavbarProps {
  primary: React.ReactNode;
  secondary: React.ReactNode;
}

const useScrollListener = (listener: (event: Event) => void) => {
  const listenerRef = useRef(listener);
  useEffect(() => {
    listenerRef.current = listener;
  });
  useEffect(() => {
    let ticking = false;
    const listener = (ev: Event) => {
      if (ticking) return;
      requestAnimationFrame(() => {
        listenerRef.current(ev);
        ticking = false;
      });
      ticking = true;
    };
    document.addEventListener("scroll", listener, { passive: true });
    return () => {
      document.removeEventListener("scroll", listener);
    };
  }, []);
};

export const Navbar: React.FC<NavbarProps> = ({ primary, secondary }) => {
  const dialog = useDialogState();
  const [scrolled, setScrolled] = useState(false);
  useScrollListener(() => {
    setScrolled(window.scrollY > 0);
  });

  return (
    <Nav $scrolled={scrolled}>
      <MobileMenu dialog={dialog}>{secondary}</MobileMenu>
      <Container
        display="flex"
        alignItems="center"
        justifyContent={{ _: "space-between", md: "flex-start" }}
      >
        {primary}
        <NavbarSecondary>{secondary}</NavbarSecondary>
        <DialogDisclosure
          state={dialog}
          aria-label="Toggle navigation"
          as={Burger}
        />
      </Container>
    </Nav>
  );
};
