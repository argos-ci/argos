import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import {
  Menu as AriakitMenu,
  MenuButton as AriakitMenuButton,
  MenuButtonProps as AriakitMenuButtonProps,
  MenuItem as AriakitMenuItem,
  MenuItemProps as AriakitMenuItemProps,
  MenuProps as AriakitMenuProps,
  MenuSeparator as AriakitMenuSeparator,
  MenuSeparatorProps as AriakitMenuSeparatorProps,
} from "ariakit/menu";
import { clsx } from "clsx";
import { Children, cloneElement, forwardRef } from "react";

export { MenuButton, useMenuState } from "ariakit/menu";
export type { MenuState } from "ariakit/menu";

export type MenuSeparatorProps = Omit<AriakitMenuSeparatorProps, "className">;

export const MenuSeparator = forwardRef<HTMLHRElement, MenuSeparatorProps>(
  (props, ref) => {
    return (
      <AriakitMenuSeparator
        ref={ref}
        className="-mx-1 my-1 border-t"
        {...props}
      />
    );
  },
);

export type MenuProps = AriakitMenuProps;

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriakitMenu
        ref={ref}
        className={clsx(
          "z-50 max-h-[--popover-available-height] min-w-[--popover-anchor-width] overflow-auto rounded-lg border bg-subtle p-1 focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

type MenuItemVariant = "default" | "danger";

export type MenuItemProps = Omit<AriakitMenuItemProps, "className"> & {
  pointer?: boolean;
  selected?: boolean;
  variant?: MenuItemVariant;
};

const menuItemVariantClasses: Record<MenuItemVariant, string> = {
  default: "text hover:bg-active focus:bg-active",
  danger: "text-danger-low hover:bg-danger-active focus:bg-danger-active",
};

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ pointer, ...props }, ref) => {
    const pointerClassName = pointer ? "cursor-pointer" : "cursor-default";
    return (
      <AriakitMenuItem
        ref={ref}
        className={clsx(
          pointerClassName,
          menuItemVariantClasses[props.variant ?? "default"],
          "flex items-center rounded px-3 py-1.5 text-sm transition focus:outline-none aria-disabled:opacity-disabled aria-disabled:hover:bg-transparent",
        )}
        {...props}
      />
    );
  },
);

export interface MenuItemIconProps {
  children: React.ReactElement;
  className?: string;
}

export const MenuItemIcon = ({
  children,
  className = "",
}: MenuItemIconProps) => {
  return (
    <div className="mr-2 w-[18px]">
      {cloneElement(Children.only(children), {
        className: clsx(className, "h-[1em] w-[1em] mx-auto"),
      })}
    </div>
  );
};

export const MenuTitle = (props: { children: React.ReactNode }) => {
  return (
    <div className="px-2 py-1.5 text-xs font-medium text-low">
      {props.children}
    </div>
  );
};

export const MenuText = (props: { children: React.ReactNode }) => {
  return (
    <>
      <MenuSeparator />
      <div className="px-2 py-1.5 text-xs text-low">{props.children}</div>
    </>
  );
};

export type UpDownMenuButtonProps = Omit<AriakitMenuButtonProps, "children">;

export const UpDownMenuButton = ({
  className,
  ...props
}: UpDownMenuButtonProps) => {
  return (
    <AriakitMenuButton
      className={clsx(
        "border-border rounded-md border p-0.5 text-low hover:border-hover hover:text aria-expanded:bg-active aria-expanded:text",
        className,
      )}
      {...props}
    >
      <ChevronUpDownIcon className="h-4 w-4" />
    </AriakitMenuButton>
  );
};
