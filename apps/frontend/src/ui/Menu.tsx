import { Children, cloneElement } from "react";
import { clsx } from "clsx";
import { ChevronsUpDownIcon } from "lucide-react";

/**
 * What is left of the old menu.
 *
 * Menus themselves live in `ui/menu-kit` now. These three pieces stayed behind
 * because `ListBox` and `Select` are still React Aria collections and share the
 * row's look with it — they go when those move.
 */

/** The surface a list box draws on. */
export const menuClassName = "overflow-auto p-1.5 outline-hidden select-none";

type MenuItemVariant = "default" | "danger";

const menuItemVariantClasses: Record<MenuItemVariant, string> = {
  default: clsx("text-default/90 data-focused:bg-hover/70"),
  danger: "text-danger-low/90 data-focused:bg-danger-hover/70",
};

/** A row on that surface, shared with `ListBoxItem`. */
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
    "aria-disabled:opacity-disabled flex items-center rounded-lg px-2.5 py-1.5 text-menu focus:outline-hidden data-focused:data-disabled:bg-transparent",
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

export type UpDownMenuButtonProps = React.ComponentPropsWithRef<"button">;

/** The stubby chevron button a breadcrumb hangs its menu from. */
export function UpDownMenuButton({
  className,
  ...props
}: UpDownMenuButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "text-low hover:border-hover hover:text-default aria-expanded:bg-active aria-expanded:text-default focus-ring border-thin cursor-default rounded-lg p-0.5",
        className,
      )}
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
    </button>
  );
}
