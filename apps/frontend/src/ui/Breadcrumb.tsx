import { HTMLProps } from "react";
import { clsx } from "clsx";

import { HeadlessLink, HeadlessLinkProps } from "./Link";
import { UpDownMenuButton, type UpDownMenuButtonProps } from "./Menu";

export function BreadcrumbItem(props: HTMLProps<HTMLLIElement>) {
  return (
    <li className="flex min-w-0 items-center gap-2 md:shrink-0" {...props} />
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
export function BreadcrumbLabel(props: { children: React.ReactNode }) {
  return <span className="truncate">{props.children}</span>;
}

export function BreadcrumbSeparator() {
  return (
    <span
      className="text-2xl leading-none text-(--gray-7) select-none"
      role="separator"
      aria-orientation="vertical"
    >
      /
    </span>
  );
}

export function BreadcrumbMenuButton({
  className,
  ...props
}: UpDownMenuButtonProps) {
  return (
    <UpDownMenuButton className={clsx("shrink-0", className)} {...props} />
  );
}
