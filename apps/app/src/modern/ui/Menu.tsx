import { MenuItem as AriakitMenuItem, Menu as AriakitMenu } from "ariakit/menu";
import type {
  MenuItemProps as AriakitMenuItemProps,
  MenuProps as AriakitMenuProps,
} from "ariakit/menu";
import { Children, cloneElement, forwardRef } from "react";

export { MenuButton, useMenuState } from "ariakit/menu";

export type MenuProps = Omit<AriakitMenuProps, "className">;

export const Menu = forwardRef<HTMLDivElement, MenuProps>((props, ref) => {
  return (
    <AriakitMenu
      ref={ref}
      className="z-50 min-w-[var(--popover-anchor-width)] rounded-lg border border-menu-border bg-menu-bg p-1 focus:outline-none"
      {...props}
    />
  );
});

export type MenuItemProps = Omit<AriakitMenuItemProps, "className">;

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  (props, ref) => {
    return (
      <AriakitMenuItem
        ref={ref}
        className="flex cursor-default items-center rounded py-1.5 px-3 text-sm text-menu-on transition hover:bg-menu-item-hover-bg hover:text-menu-hover-on focus:bg-menu-item-hover-bg focus:outline-none aria-disabled:opacity-70"
        {...props}
      />
    );
  }
);

export interface MenuItemIconProps {
  children: React.ReactElement;
  className?: string;
}

export const MenuItemIcon = ({
  children,
  className = "",
}: MenuItemIconProps) => {
  return cloneElement(Children.only(children), {
    className: `${className} h-[1em] w-[1em] mr-3`,
  });
};
