import { clsx } from "clsx";
import { ComponentProps, HTMLProps } from "react";
import { Link } from "react-router-dom";

import { UpDownMenuButton, UpDownMenuButtonProps } from "./Menu";

export const BreadcrumbItem = (props: HTMLProps<HTMLLIElement>) => {
  return <li className="flex shrink-0 items-center gap-2" {...props} />;
};

export const BreadcrumbLink = (props: ComponentProps<typeof Link>) => {
  return (
    <Link
      className="flex min-h-[28px] items-center gap-2 font-medium text-low transition hover:text aria-[current=page]:cursor-default aria-[current=page]:text"
      {...props}
    />
  );
};

export const BreadcrumbItemIcon = (props: { children: React.ReactNode }) => {
  return (
    <div className="flex h-6 w-6 items-center justify-center">
      {props.children}
    </div>
  );
};

export const BreadcrumbSeparator = () => {
  return (
    <span
      className="select-none text-2xl leading-none text-low"
      role="separator"
      aria-orientation="vertical"
    >
      /
    </span>
  );
};

export const BreadcrumbMenuButton = ({
  className,
  ...props
}: UpDownMenuButtonProps) => {
  return (
    <UpDownMenuButton className={clsx("shrink-0", className)} {...props} />
  );
};
