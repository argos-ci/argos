import { ChevronDownIcon } from "@primer/octicons-react";
import { ComponentProps, HTMLProps } from "react";
import { Link } from "react-router-dom";

import { MenuButton, MenuState } from "./Menu";

export const Breadcrumb = (props: { children: React.ReactNode }) => {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 py-4 font-light">
        {props.children}
      </ol>
    </nav>
  );
};

export const BreadcrumbItem = (props: HTMLProps<HTMLLIElement>) => {
  return <li className="flex flex-shrink-0 items-center gap-1" {...props} />;
};

export const BreadcrumbLink = (props: ComponentProps<typeof Link>) => {
  return (
    <Link
      className="flex min-h-[28px] items-center gap-2 font-medium text-on-light transition hover:text-on aria-[current=page]:cursor-default aria-[current=page]:text-on"
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
      className="text-2xl leading-none text-on-light"
      role="separator"
      aria-orientation="vertical"
    >
      /
    </span>
  );
};

export const BreadcrumbMenuButton = (props: { state: MenuState }) => {
  return (
    <MenuButton
      state={props.state}
      className="p-1 text-on-light transition hover:text-on focus:text-on focus:outline-none aria-expanded:text-on"
    >
      <ChevronDownIcon size={18} />
    </MenuButton>
  );
};
