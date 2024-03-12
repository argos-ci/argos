import { Children, cloneElement, forwardRef, HTMLProps } from "react";
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
import { ChevronsUpDownIcon } from "lucide-react";

export { MenuButton, useMenuState } from "ariakit/menu";
export type { MenuState } from "ariakit/menu";

export const MenuSeparator = forwardRef<
  HTMLHRElement,
  Omit<AriakitMenuSeparatorProps, "className">
>((props, ref) => {
  return (
    <AriakitMenuSeparator
      ref={ref}
      className="-mx-1 my-1 border-t"
      {...props}
    />
  );
});

export const Menu = forwardRef<HTMLDivElement, AriakitMenuProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriakitMenu
        ref={ref}
        className={clsx(
          "bg-subtle z-50 max-h-[--popover-available-height] min-w-[--popover-anchor-width] overflow-auto rounded-lg border p-1 focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

type MenuItemVariant = "default" | "danger";

const menuItemVariantClasses: Record<MenuItemVariant, string> = {
  default: "text hover:bg-active focus:bg-active",
  danger: "text-danger-low hover:bg-danger-active focus:bg-danger-active",
};

export const MenuItem = forwardRef<
  HTMLDivElement,
  Omit<AriakitMenuItemProps, "className"> & {
    pointer?: boolean;
    selected?: boolean;
    variant?: MenuItemVariant;
  }
>(({ pointer, ...props }, ref) => {
  const pointerClassName = pointer ? "cursor-pointer" : "cursor-default";
  return (
    <AriakitMenuItem
      ref={ref}
      className={clsx(
        pointerClassName,
        menuItemVariantClasses[props.variant ?? "default"],
        "aria-disabled:opacity-disabled flex items-center rounded px-3 py-1.5 text-sm transition focus:outline-none aria-disabled:hover:bg-transparent",
      )}
      {...props}
    />
  );
});

export const MenuItemIcon = ({
  children,
  className = "",
}: {
  children: React.ReactElement;
  className?: string;
}) => {
  return (
    <div className="mr-2 w-[18px]">
      {cloneElement(Children.only(children), {
        className: clsx(className, "size-[1em] mx-auto"),
      })}
    </div>
  );
};

export const MenuItemShortcut = ({
  children,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div {...props} className="text-low absolute right-5">
      {children}
    </div>
  );
};

export const MenuTitle = (props: { children: React.ReactNode }) => {
  return (
    <div className="text-low px-2 py-1.5 text-xs font-medium">
      {props.children}
    </div>
  );
};

export const MenuText = (props: { children: React.ReactNode }) => {
  return (
    <>
      <MenuSeparator />
      <div className="text-low px-2 py-1.5 text-xs">{props.children}</div>
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
        "border-border text-low hover:border-hover hover:text aria-expanded:bg-active aria-expanded:text cursor-default rounded-md border p-0.5",
        className,
      )}
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
    </AriakitMenuButton>
  );
};
