import { Children, cloneElement } from "react";
import { clsx } from "clsx";
import { CheckIcon, ChevronRightIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  Button,
  ButtonProps,
  Header,
  Keyboard,
  MenuItemProps,
  MenuProps,
  Menu as RACMenu,
  MenuItem as RACMenuItem,
  Separator,
} from "react-aria-components";

export function MenuSeparator() {
  return <Separator className="-mx-1 my-1 border-t" />;
}

export { MenuTrigger } from "react-aria-components";

export function Menu<T extends object>({ className, ...props }: MenuProps<T>) {
  return (
    <RACMenu<T>
      className={clsx("select-none overflow-auto outline-none", className)}
      {...props}
    />
  );
}

type MenuItemVariant = "default" | "danger";

const menuItemVariantClasses: Record<MenuItemVariant, string> = {
  default: "text hover:bg-hover focus:bg-hover",
  danger: "text-danger-low hover:bg-danger-hover focus:bg-danger-hover",
};

export function MenuItem(
  props: Omit<MenuItemProps, "className"> & {
    variant?: MenuItemVariant;
    children: React.ReactNode;
  },
) {
  return (
    <RACMenuItem
      className={clsx(
        menuItemVariantClasses[props.variant ?? "default"],
        props.href ? "cursor-pointer" : "cursor-default",
        "aria-disabled:opacity-disabled flex items-center rounded px-3 py-1.5 text-sm focus:outline-none aria-disabled:hover:bg-transparent",
      )}
      {...props}
    >
      {(menuProps) => {
        if (menuProps.hasSubmenu) {
          return (
            <div className="flex flex-1 items-center justify-between gap-2">
              <div className="flex items-center">{props.children}</div>
              <ChevronRightIcon className="text size-4" />
            </div>
          );
        }
        if (menuProps.selectionMode === "single") {
          return (
            <div className="flex items-center justify-between gap-2">
              <CheckIcon
                className={clsx(
                  "size-4",
                  menuProps.isSelected ? "" : "opacity-0",
                )}
              />
              <div className="flex items-center">{props.children}</div>
            </div>
          );
        }

        return props.children;
      }}
    </RACMenuItem>
  );
}

export function MenuItemIcon(props: {
  children: React.ReactElement;
  className?: string;
}) {
  return (
    <div className="mr-2">
      {cloneElement(Children.only(props.children), {
        className: clsx("size-[1em] mx-auto", props.className),
      })}
    </div>
  );
}

export function MenuItemShortcut(props: { children: React.ReactNode }) {
  return <Keyboard className="text-low absolute right-5" {...props} />;
}

export function MenuTitle(props: { children: React.ReactNode }) {
  return (
    <Header className="text-low px-2 py-1.5 text-xs font-medium" {...props} />
  );
}

export function MenuLoader() {
  return (
    <RACMenuItem isDisabled className="text-low px-2 py-1.5 text-xs">
      Loading...
    </RACMenuItem>
  );
}

export function MenuText(props: { children: React.ReactNode }) {
  return (
    <RACMenuItem isDisabled className="text-low px-2 py-1.5 text-xs">
      {props.children}
    </RACMenuItem>
  );
}

export type UpDownMenuButtonProps = Omit<ButtonProps, "children">;

export function UpDownMenuButton({
  className,
  ...props
}: UpDownMenuButtonProps) {
  return (
    <Button
      className={clsx(
        "border-base text-low data-[hovered]:border-hover data-[hovered]:text aria-expanded:bg-active aria-expanded:text rac-focus cursor-default rounded-md border p-0.5",
        className,
      )}
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
    </Button>
  );
}
