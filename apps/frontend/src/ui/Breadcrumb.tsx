import { HTMLProps } from "react";
import { clsx } from "clsx";
import { ChevronsUpDownIcon } from "lucide-react";
import { useMatch } from "react-router";

import { HeadlessLink, HeadlessLinkProps } from "./Link";
import { MenuRoot, MenuTrigger } from "./menu-kit";

export function BreadcrumbItem({
  className,
  ...props
}: HTMLProps<HTMLLIElement>) {
  return (
    <li
      className={clsx("flex min-w-0 items-center gap-2", className)}
      {...props}
    />
  );
}

export function BreadcrumbLink(props: HeadlessLinkProps) {
  return (
    <HeadlessLink
      className="text-low hover:text-default aria-[current=page]:text-default flex min-h-7 min-w-0 items-center gap-1.5 font-medium transition aria-[current=page]:cursor-default"
      {...props}
    />
  );
}

export function BreadcrumbItemIcon(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex size-6 shrink-0 items-center justify-center",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

/** The name in a breadcrumb link, cut short when a phone runs out of room. */
export function BreadcrumbLabel(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx("truncate", props.className)}>{props.children}</span>
  );
}

export function BreadcrumbSeparator(props: { className?: string }) {
  return (
    <span
      className={clsx(
        "text-2xl leading-none text-(--gray-7) select-none",
        props.className,
      )}
      role="separator"
      aria-orientation="vertical"
    >
      /
    </span>
  );
}

/**
 * A crumb that opens the menu of its siblings, all of it: how a phone has it,
 * where a finger needs the whole crumb as a target.
 */
export function BreadcrumbMenuButton({
  current = false,
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<"button"> & {
  /** The page is this crumb's, rather than one of its children's. */
  current?: boolean;
}) {
  return (
    <button
      type="button"
      className={clsx(
        "focus-ring enabled-hover:bg-hover aria-expanded:bg-active pointer-coarse:h-10 pointer-coarse:px-2 flex h-8 min-w-0 cursor-default items-center gap-1.5 rounded-lg px-1.5 font-medium transition",
        current
          ? "text-default"
          : "text-low hover:text-default aria-expanded:text-default",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronsUpDownIcon className="text-low size-4 shrink-0" />
    </button>
  );
}

/**
 * A crumb that links to its page, with a chevron beside it that opens the menu
 * of its siblings: one shape, two targets. Pointing at either lights both, the
 * one under the pointer more, so the shape reads as one control in two.
 */
export function BreadcrumbSplitButton(props: {
  href: string;
  /** The page is this crumb's, rather than one of its children's. */
  current?: boolean;
  /** Names the chevron, which has no text of its own. */
  menuLabel: string;
  children: React.ReactNode;
  /** The sibling menu, opened from the chevron. */
  menu: React.ReactNode;
  className?: string;
}) {
  const { href, current = false, menuLabel, children, menu } = props;
  const isPage = Boolean(useMatch(href));
  return (
    <div
      className={clsx("group/crumb flex min-w-0 items-center", props.className)}
    >
      <HeadlessLink
        href={href}
        aria-current={isPage ? "page" : undefined}
        className={clsx(
          "hover:bg-hover group-hover/crumb:not-hover:bg-hover/50 group-has-[[aria-expanded=true]]/crumb:not-hover:bg-hover/50 pointer-coarse:h-10 flex h-8 min-w-0 items-center gap-1.5 rounded-l-lg pr-1 pl-1.5 font-medium transition",
          current
            ? "text-default"
            : "text-low group-hover/crumb:text-default group-has-[[aria-expanded=true]]/crumb:text-default",
        )}
      >
        {children}
      </HeadlessLink>
      <MenuRoot>
        <MenuTrigger>
          <button
            type="button"
            aria-label={menuLabel}
            className="focus-ring enabled-hover:not-aria-expanded:bg-hover group-hover/crumb:not-hover:not-aria-expanded:bg-hover/50 aria-expanded:bg-active text-low group-hover/crumb:text-default aria-expanded:text-default flex h-8 w-7 shrink-0 cursor-default items-center justify-center rounded-r-lg transition pointer-coarse:h-10 pointer-coarse:w-9"
          >
            <ChevronsUpDownIcon className="size-4" />
          </button>
        </MenuTrigger>
        {menu}
      </MenuRoot>
    </div>
  );
}
