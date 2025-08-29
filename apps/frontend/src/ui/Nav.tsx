import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import { NavLink as RouterNavLink, type NavLinkProps } from "react-router-dom";

export function Nav(props: ComponentPropsWithRef<"nav">) {
  return <nav {...props} />;
}

export function NavList(props: ComponentPropsWithRef<"ul">) {
  return (
    <ul {...props} className={clsx("flex flex-col gap-px", props.className)} />
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
        "hover:bg-hover text-low aria-[current=page]:text-default flex rounded px-3 py-2.5 text-sm aria-[current=page]:font-medium",
        props.className,
      )}
    />
  );
}
