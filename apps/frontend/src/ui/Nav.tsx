import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import { NavLink as RouterNavLink, type NavLinkProps } from "react-router";

import { useRevealSelected } from "./useRevealSelected";

export function Nav(props: ComponentPropsWithRef<"nav">) {
  return <nav {...props} />;
}

export function NavList(props: ComponentPropsWithRef<"ul">) {
  const ref = useRevealSelected('[aria-current="page"]');
  return (
    <ul
      {...props}
      ref={ref}
      className={clsx(
        "relative flex flex-col gap-px max-md:flex-row max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:*:shrink-0",
        props.className,
      )}
    />
  );
}

export function NavListItem(props: ComponentPropsWithRef<"li">) {
  return <li {...props} />;
}

export function NavLink(props: NavLinkProps) {
  return (
    <RouterNavLink
      {...props}
      className={clsx(
        "hover:bg-hover text-low aria-[current=page]:text-default flex rounded-lg px-3 py-2.5 text-sm aria-[current=page]:font-medium",
        props.className,
      )}
    />
  );
}
