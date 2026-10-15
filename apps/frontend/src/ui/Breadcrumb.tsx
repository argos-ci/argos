import { HTMLProps } from "react";
import { clsx } from "clsx";
import { ChevronsUpDownIcon } from "lucide-react";

import { HeadlessLink, HeadlessLinkProps } from "./Link";

export function BreadcrumbItem({
  className,
  ...props
}: HTMLProps<HTMLLIElement>) {
  return (
    <li
      className={clsx("flex min-w-0 items-center gap-2 md:shrink-0", className)}
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

export function BreadcrumbItemIcon(props: { children: React.ReactNode }) {
  return (
    <div className="flex size-6 shrink-0 items-center justify-center">
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
 * A crumb that opens the menu of its siblings, all of it: a chevron beside a
 * link was too small a target, and the link only led where the logo or the
 * tabs below already do.
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
        "focus-ring enabled-hover:bg-hover aria-expanded:bg-active pointer-coarse:h-10 flex h-8 min-w-0 cursor-default items-center gap-1.5 rounded-lg px-1.5 font-medium transition",
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
