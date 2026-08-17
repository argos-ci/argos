import type { ReactNode } from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { clsx } from "clsx";
import { CheckIcon } from "lucide-react";

import {
  getMenuItemClassName,
  menuItemDescriptionClassName,
  menuItemIconClassName,
  menuListClassName,
  menuSeparatorClassName,
} from "./menuStyle";
import {
  popupAnimationClassName,
  popupSurfaceClassName,
  popupZIndexClassName,
} from "./popupSurface";

/** Tallest the list gets before it scrolls, room permitting. */
const LIST_MAX_HEIGHT = 416;

/**
 * The options of a `Select`, and the popup that holds them.
 *
 * The popup is part of the list rather than a wrapper around it — there is no
 * `SelectPopover` any more, the way a menu owns its own surface.
 */
export function ListBox(props: { children: ReactNode; className?: string }) {
  const { children, className } = props;
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        sideOffset={4}
        align="start"
        // Base UI otherwise lays the chosen option over the trigger, which
        // moves the popup somewhere the react-aria version never put it.
        alignItemWithTrigger={false}
        className={clsx(popupZIndexClassName, "max-w-(--available-width)")}
      >
        <BaseSelect.Popup
          className={clsx(
            popupSurfaceClassName,
            popupAnimationClassName,
            "flex-col overflow-hidden outline-hidden select-none",
            className,
          )}
        >
          <BaseSelect.List
            className={menuListClassName}
            style={{
              maxHeight: `min(${LIST_MAX_HEIGHT}px, var(--available-height))`,
            }}
          >
            {children}
          </BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

/** The hairline between groups of options. */
export function ListBoxSeparator() {
  return <BaseSelect.Separator className={menuSeparatorClassName} />;
}

export function ListBoxItem(props: {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}) {
  const { children, className, ...rest } = props;
  return (
    <BaseSelect.Item
      {...rest}
      className={clsx(getMenuItemClassName(), className)}
    >
      {/* Always rendered, so every row's words line up whether or not it is
          the chosen one. */}
      <CheckIcon className="size-4 shrink-0 opacity-0 group-data-selected/menu-item:opacity-100" />
      <span className="flex min-w-0 flex-1 flex-col">{children}</span>
    </BaseSelect.Item>
  );
}

/** The icon an option leads with. */
export function ListBoxItemIcon(props: { children: ReactNode }) {
  return <span className={menuItemIconClassName}>{props.children}</span>;
}

/**
 * An option's name. It ellipsizes rather than widening the list.
 *
 * `ItemText` rather than a plain span: Base UI reads it to describe the option
 * to assistive tech and for typeahead.
 */
export function ListBoxItemLabel(props: { children: ReactNode }) {
  return <BaseSelect.ItemText className="truncate" {...props} />;
}

/** A second line under the option's name, saying what choosing it means. */
export function ListBoxItemDescription(props: { children: ReactNode }) {
  return (
    <span
      className={clsx(menuItemDescriptionClassName, "whitespace-normal")}
      {...props}
    />
  );
}
