import { Children, cloneElement } from "react";
import { clsx } from "clsx";
import {
  CheckIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  InfoIcon,
} from "lucide-react";
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

import { Tooltip } from "./Tooltip";

export function MenuSeparator() {
  return <Separator className="my-1 border-t" />;
}

export { MenuTrigger } from "react-aria-components";

export function Menu<T extends object>(
  props: MenuProps<T> & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACMenu<T>
      {...props}
      className={clsx(
        "outline-hidden select-none overflow-auto",
        props.className,
      )}
    />
  );
}

type MenuItemVariant = "default" | "danger";

const menuItemVariantClasses: Record<MenuItemVariant, string> = {
  default: "text-default data-[focused]:bg-hover",
  danger: "text-danger-low data-[focused]:bg-danger-hover",
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
        "aria-disabled:opacity-disabled focus:outline-hidden flex items-center rounded-sm px-3 py-1.5 text-sm data-[focused]:data-[disabled]:bg-transparent",
      )}
      {...props}
    >
      {(menuProps) => {
        if (menuProps.hasSubmenu) {
          return (
            <div className="flex flex-1 items-center justify-between gap-2">
              <div className="flex items-center">{props.children}</div>
              <ChevronRightIcon className="text-default size-4" />
            </div>
          );
        }
        if (
          menuProps.selectionMode === "single" ||
          menuProps.selectionMode === "multiple"
        ) {
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
  children: React.ReactElement<{
    className?: string;
    "aria-hidden"?: React.AriaAttributes["aria-hidden"];
  }>;
  className?: string;
  position?: "left" | "right";
}) {
  const position = props.position ?? "left";
  const child = Children.only(props.children);
  return (
    <div
      className={clsx(
        {
          left: "mr-2",
          right: "ml-2",
        }[position],
        props.className,
      )}
    >
      {cloneElement(child, {
        "aria-hidden": true,
        className: clsx("size-[1em] mx-auto", child.props.className),
      })}
    </div>
  );
}

export function MenuItemTooltip(props: { content: React.ReactNode }) {
  if (!props.content) {
    return null;
  }
  return (
    <MenuItemIcon>
      <Tooltip content={props.content}>
        <InfoIcon className="size-[1em]" />
      </Tooltip>
    </MenuItemIcon>
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
        "border-default text-low data-[hovered]:border-hover data-[hovered]:text-default aria-expanded:bg-active aria-expanded:text-default rac-focus cursor-default rounded-md border p-0.5",
        className,
      )}
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
    </Button>
  );
}
