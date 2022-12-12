import { useState, useEffect, useRef } from "react";
import { Dialog, DialogDisclosure, useDialogState } from "ariakit/dialog";
import { Burger } from "./Burger";
import { Container } from "./Container";
import { Link } from "./Link";

import type { DialogState } from "ariakit/dialog";
import clsx from "clsx";

const NavbarSecondary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="hidden md:flex flex-1 items-center justify-end gap-8">
    {children}
  </div>
);

export const NavbarLink: React.FC<{
  href: string;
  children: React.ReactNode;
}> = (props) => <Link className="block py-3" {...props} />;

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
      <div className="fixed bg-black top-[68px] right-0 bottom-0 left-0 z-10 overflow-auto p-6 flex flex-col gap-3 md:hidden">
        {children}
      </div>
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
    <nav
      className={clsx(
        "sticky top-0 left-0 z-10 backdrop-blur-[5px] backdrop-saturate-[180%] py-3 text-sm border-b border-b-transparent transition bg-black md:bg-transparent",
        scrolled && "border-b-slate-800"
      )}
    >
      <MobileMenu dialog={dialog}>{secondary}</MobileMenu>
      <Container className="flex items-center justify-between md:justify-start">
        {primary}
        <NavbarSecondary>{secondary}</NavbarSecondary>
        <DialogDisclosure
          state={dialog}
          aria-label="Toggle navigation"
          as={Burger}
        />
      </Container>
    </nav>
  );
};
