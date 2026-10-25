import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import {
  matchPath,
  NavLink as RouterNavLink,
  useLocation,
  useNavigate,
  type NavLinkProps,
} from "react-router";

import { ListBox, ListBoxItem } from "./ListBox";
import { Select, SelectButton, SelectValue } from "./Select";

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
        "hover:bg-hover text-low aria-[current=page]:text-default flex rounded-lg px-3 py-2.5 text-sm aria-[current=page]:font-medium",
        props.className,
      )}
    />
  );
}

/**
 * The links of a `NavList`, picked from a select. The one shown is the one
 * matching the current page exactly, as `NavLink` does with `end`.
 */
export function NavSelect(props: {
  items: { name: string; href: string }[];
  "aria-label": string;
  className?: string;
}) {
  const { items } = props;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = items.find((item) =>
    matchPath({ path: item.href, end: true }, pathname),
  );
  return (
    <Select
      aria-label={props["aria-label"]}
      className={props.className}
      items={Object.fromEntries(items.map((item) => [item.href, item.name]))}
      value={current ? current.href : null}
      onValueChange={(href) => {
        if (href) {
          navigate(href);
        }
      }}
    >
      <SelectButton>
        <SelectValue />
      </SelectButton>
      <ListBox className="min-w-(--anchor-width)">
        {items.map((item) => (
          <ListBoxItem key={item.href} value={item.href}>
            {item.name}
          </ListBoxItem>
        ))}
      </ListBox>
    </Select>
  );
}
