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
  return <Separator className="border-t-thin -mx-1.5 my-1.5" />;
}

export { MenuTrigger, SubmenuTrigger } from "react-aria-components";

/**
 * The surface a menu draws on. `ListBox` wears it too — a select's popover and
 * a menu's are the same surface — so it is defined here and imported there
 * rather than written twice.
 */
export const menuClassName = "overflow-auto p-1.5 outline-hidden select-none";

export function Menu<T extends object>(
  props: MenuProps<T> & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACMenu<T> {...props} className={clsx(menuClassName, props.className)} />
  );
}

type MenuItemVariant = "default" | "danger";

const menuItemVariantClasses: Record<MenuItemVariant, string> = {
  default: clsx("text-default/90 data-focused:bg-hover/80"),
  danger: "text-danger-low/90 data-focused:bg-danger-hover/80",
};

/**
 * A row on that surface, and the source of truth for one: `ListBoxItem` is
 * built from this, so a select's options and a menu's items stay the same row.
 * `group/menu-item` is part of the deal — `MenuItemIcon` reaches the row
 * through it, and it serves the list box under its own name.
 */
export function getMenuItemClassName(options: {
  variant?: MenuItemVariant;
  /** A row that navigates takes the pointer; one that acts keeps the arrow. */
  href?: string;
}) {
  const { variant = "default", href } = options;
  return clsx(
    "group/menu-item font-[450]",
    menuItemVariantClasses[variant],
    href ? "cursor-pointer" : "cursor-default",
    "aria-disabled:opacity-disabled flex items-center rounded-lg px-2.5 py-1.5 text-menu focus:outline-hidden data-focused:data-disabled:bg-transparent data-open:bg-active/80",
  );
}

type MenuItemProps = Omit<RACMenuItemProps, "className"> & {
  variant?: MenuItemVariant;
  children: React.ReactNode;
};

export function MenuItem(props: MenuItemProps) {
  const { variant = "default", ...rest } = props;
  const menuContext = use(MenuContext);
  const checkboxRef = useRef<HTMLSpanElement>(null);
  return (
    <RACMenuItem
      className={getMenuItemClassName({ variant, href: props.href })}
      data-variant={variant}
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
          "group-data-[variant=danger]/menu-item:text-danger-low",
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
        "text-low ml-3 flex-1 shrink-0 text-right text-xs font-normal",
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
        "text-low data-hovered:border-hover data-hovered:text-default aria-expanded:bg-active aria-expanded:text-default rac-focus border-thin cursor-default rounded-lg p-0.5",
        className,
      )}
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
    </Button>
  );
}
