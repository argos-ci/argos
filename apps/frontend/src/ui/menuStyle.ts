import { clsx } from "clsx";

/**
 * What a list of choices looks like — the rows, and the box that scrolls them.
 *
 * Style only, and deliberately so: three unrelated things render this shape and
 * share none of their behaviour. The menu kit reads its children and filters
 * them, a `Select` is Base UI's listbox with a value, and the editor's mention
 * and slash menus are plain buttons driven by a suggestion plugin. Giving them
 * one look meant giving them one stylesheet, not one component — before this,
 * a mention menu had smaller corners, tighter rows and a different shadow from
 * every other menu in the app.
 *
 * @see popupSurface for the box these sit in.
 */

/**
 * The scrolling box the rows live in.
 *
 * The fade belongs here rather than on `popupSurface`: a mask fades everything
 * its element paints, and on the surface that would take the popup's border and
 * shadow with it.
 */
export const menuListClassName =
  "scroll-mask-y-from-90% overflow-y-auto p-1.5 outline-hidden";

/**
 * Which row the keyboard is on.
 *
 * Two attributes, because the three renderers name it differently and none of
 * them can be talked out of it: Base UI writes `data-highlighted` on its own
 * items, while the menu kit and the editor menus set `data-active` on rows they
 * render themselves. Styling both is what lets one string serve all three.
 */
const activeRowSelectors =
  "data-active:bg-hover/70 data-highlighted:bg-hover/70";

const activeDangerRowSelectors =
  "data-active:bg-danger-hover/70 data-highlighted:bg-danger-hover/70";

export type MenuItemVariant = "default" | "danger";

/**
 * A row in one of those lists.
 *
 * @param variant - `danger` for a destructive action.
 * @param interactive - a row that navigates takes the pointer; one that acts
 *   keeps the arrow, the way a native menu does.
 */
export function getMenuItemClassName(options?: {
  variant?: MenuItemVariant;
  interactive?: boolean;
}) {
  const { variant = "default", interactive = false } = options ?? {};
  return clsx(
    "group/menu-item text-menu flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-[450] outline-hidden",
    interactive ? "cursor-pointer" : "cursor-default",
    variant === "danger"
      ? clsx("text-danger-low/90", activeDangerRowSelectors)
      : clsx("text-default/90", activeRowSelectors),
    // Disabled rows dim and take no highlight, however the renderer says so.
    "aria-disabled:opacity-disabled data-disabled:opacity-disabled",
  );
}

/** A row that is the chosen one, where that reads as a fill rather than a tick. */
export const selectedMenuItemClassName = "bg-active/70 font-medium";

/**
 * The icon a row leads with. Dims until the row is the active one, so a column
 * of icons stays quiet.
 */
export const menuItemIconClassName =
  "text-low group-data-active/menu-item:text-default group-data-highlighted/menu-item:text-default group-data-[variant=danger]/menu-item:text-danger-low shrink-0 [&_svg]:size-[1em]";

/** A second line under the label — a description, or what a shortcut does. */
export const menuItemDescriptionClassName =
  "text-low truncate text-xs font-normal";

/** The trailing bit: a shortcut, a count, a check. */
export const menuItemSuffixClassName = "text-low shrink-0 text-xs";

/** The hairline between groups of rows. */
export const menuSeparatorClassName = "border-t-thin -mx-1.5 my-1.5";

/** A heading naming the group of rows under it. */
export const menuHeadingClassName = "text-low px-2 py-1.5 text-xs font-medium";

/** A line of prose among the rows — a loader, an empty state, a hint. */
export const menuTextClassName = "text-low px-2.5 py-1.5 text-xs";
