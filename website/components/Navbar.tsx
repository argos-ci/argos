import { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Burger } from "./Burger";
import { Container } from "./Container";
import { Link } from "./Link";

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
  const [scrolled, setScrolled] = useState(false);
  useScrollListener(() => {
    setScrolled(window.scrollY > 0);
  });
  const [open, setOpen] = useState(false);

  return (
    <nav
      className={clsx(
        "sticky top-0 left-0 z-10 backdrop-blur-[5px] backdrop-saturate-[180%] py-3 text-sm border-b border-b-transparent transition bg-black md:bg-transparent",
        scrolled && "border-b-slate-800"
      )}
    >
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            onClick={(event) => {
              if ((event.target as HTMLElement).tagName === "A") {
                setOpen(false);
              }
            }}
            aria-label="Menu"
            className={clsx(
              "fixed bg-black inset-0 top-[68px] z-10 overflow-auto p-6 flex flex-col gap-3 md:hidden",
              "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            )}
          >
            {secondary}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
        <Container className="flex items-center justify-between md:justify-start">
          {primary}
          <NavbarSecondary>{secondary}</NavbarSecondary>
          <DialogPrimitive.Trigger asChild>
            <Burger />
          </DialogPrimitive.Trigger>
        </Container>
      </DialogPrimitive.Root>
    </nav>
  );
};
