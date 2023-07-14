import { ChevronUpDownIcon } from "@heroicons/react/24/solid";
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
  return <li className="flex shrink-0 items-center gap-2" {...props} />;
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
      className="select-none text-2xl leading-none text-on-light"
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
      className="cursor-default rounded-md border border-border px-0.5 py-1 text-on-light transition hover:border-border-hover hover:text-on aria-expanded:border-border-hover aria-expanded:bg-slate-800 aria-expanded:text-on"
    >
      <ChevronUpDownIcon className="h-4 w-4" />
    </MenuButton>
  );
};
