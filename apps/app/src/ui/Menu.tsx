import {
  Menu as AriakitMenu,
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
        className="-mx-1 my-1 border-t border-t-menu-border"
        {...props}
      />
    );
  }
);

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

type MenuItemVariant = "default" | "danger";

export type MenuItemProps = Omit<AriakitMenuItemProps, "className"> & {
  pointer?: boolean;
  selected?: boolean;
  variant?: MenuItemVariant;
};

const menuItemVariantClasses: Record<MenuItemVariant, string> = {
  default: "text-menu-on hover:text-menu-hover-on",
  danger: "text-menu-danger-on hover:text-menu-danger-hover-on",
};

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ pointer, selected = false, ...props }, ref) => {
    const pointerClassName = pointer ? "cursor-pointer" : "cursor-default";
    const selectedClassName = selected ? "bg-menu-item-selected-bg" : "";
    return (
      <AriakitMenuItem
        ref={ref}
        aria-checked={selected}
        className={clsx(
          pointerClassName,
          selectedClassName,
          menuItemVariantClasses[props.variant ?? "default"],
          "flex items-center rounded px-3 py-1.5 text-sm transition hover:bg-menu-item-hover-bg focus:bg-menu-item-hover-bg focus:outline-none aria-disabled:opacity-70 aria-disabled:hover:bg-transparent"
        )}
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
    className: clsx(className, "h-[1em] w-[1em] mr-3"),
  });
};

export const MenuTitle = (props: { children: React.ReactNode }) => {
  return (
    <div className="px-2 py-1.5 text-xs font-medium text-menu-on-title">
      {props.children}
    </div>
  );
};

export const MenuText = (props: { children: React.ReactNode }) => {
  return (
    <>
      <MenuSeparator />
      <div className="px-2 py-1.5 text-xs text-menu-on-title">
        {props.children}
      </div>
    </>
  );
};
