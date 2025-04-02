import { HTMLProps } from "react";
import { clsx } from "clsx";

import { HeadlessLink, HeadlessLinkProps } from "./Link";
import { UpDownMenuButton, UpDownMenuButtonProps } from "./Menu";

export function BreadcrumbItem(props: HTMLProps<HTMLLIElement>) {
  return <li className="flex shrink-0 items-center gap-2" {...props} />;
}

export function BreadcrumbLink(props: HeadlessLinkProps) {
  return (
    <HeadlessLink
      className="text-low hover:text-default aria-[current=page]:text-default flex min-h-7 items-center gap-1.5 font-medium transition aria-[current=page]:cursor-default"
      {...props}
    />
  );
}

export function BreadcrumbItemIcon(props: { children: React.ReactNode }) {
  return (
    <div className="flex size-6 items-center justify-center">
      {props.children}
    </div>
  );
}

export function BreadcrumbSeparator() {
  return (
    <span
      className="text-(--mauve-7) select-none text-2xl leading-none"
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
