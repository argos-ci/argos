import { Children, cloneElement, use, useRef } from "react";
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
  MenuContext,
  MenuProps,
  Menu as RACMenu,
  MenuItem as RACMenuItem,
  MenuItemProps as RACMenuItemProps,
  Separator,
} from "react-aria-components";

import { Tooltip } from "./Tooltip";

export function MenuSeparator() {
  return <Separator className="my-1 border-t" />;
}

export { MenuTrigger, SubmenuTrigger } from "react-aria-components";

export function Menu<T extends object>(
  props: MenuProps<T> & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACMenu<T>
      {...props}
      className={clsx(
        "overflow-auto outline-hidden select-none",
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

const menuItemClassName =
  "aria-disabled:opacity-disabled flex items-center rounded-sm px-2 py-1.5 text-sm focus:outline-hidden data-[focused]:data-[disabled]:bg-transparent data-[open]:bg-active";

type MenuItemProps = Omit<RACMenuItemProps, "className"> & {
  variant?: MenuItemVariant;
  children: React.ReactNode;
};

export function MenuItem(props: MenuItemProps) {
  const { variant, ...rest } = props;
  const menuContext = use(MenuContext);
  const checkboxRef = useRef<HTMLSpanElement>(null);
  return (
    <RACMenuItem
      className={clsx(
        "group/menu-item",
        menuItemVariantClasses[variant ?? "default"],
        props.href ? "cursor-pointer" : "cursor-default",
        menuItemClassName,
      )}
      {...rest}
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

        if (menuProps.selectionMode === "multiple") {
          return (
            <div
              className="flex w-full items-center gap-2"
              onClick={(event) => {
                // If we click outside the checkbox
                if (
                  !checkboxRef.current ||
                  !(event.target instanceof Element) ||
                  event.target === checkboxRef.current ||
                  checkboxRef.current.contains(event.target) ||
                  !menuContext ||
                  !("onClose" in menuContext) ||
                  !menuContext.onClose
                ) {
                  return;
                }

                menuContext.onClose();
              }}
            >
              <div className="shrink-0">
                <span
                  ref={checkboxRef}
                  className={clsx(
                    "border-primary text-primary hover:border-primary-hover flex size-3.5 items-center justify-center rounded-sm border",
                    "opacity-0 group-data-focused/menu-item:opacity-100 group-data-hovered/menu-item:opacity-100",
                    menuProps.isSelected &&
                      "bg-primary-active border-active opacity-100",
                    menuProps.isDisabled &&
                      menuProps.isSelected &&
                      "opacity-disabled",
                  )}
                >
                  {menuProps.isSelected ? (
                    <CheckIcon className="size-3" />
                  ) : null}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center select-none">
                {props.children}
              </div>
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
        className: clsx(
          "size-[1em] mx-auto text-low group-data-focused/menu-item:text-default",
          child.props.className,
        ),
      })}
    </div>
  );
}

export function MenuItemSuffix(props: {
  className?: string;
  children: React.ReactNode;
}) {
  const { className, children } = props;
  return (
    <span
      className={clsx(
        "text-low ml-3 flex-1 shrink-0 text-right text-xs",
        className,
      )}
    >
      {children}
    </span>
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
      Loading…
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
        "border-default text-low data-hovered:border-hover data-hovered:text-default aria-expanded:bg-active aria-expanded:text-default rac-focus cursor-default rounded-md border p-0.5",
        className,
      )}
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
    </Button>
  );
}
