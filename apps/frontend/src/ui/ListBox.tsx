import { clsx } from "clsx";
import { CheckIcon } from "lucide-react";
import {
  ListBoxItemProps,
  ListBoxProps,
  ListBox as RACListBox,
  ListBoxItem as RACListBoxItem,
  Text,
} from "react-aria-components";

import { getMenuItemClassName, menuClassName } from "./Menu";

export function ListBox<T extends object>({
  className,
  ...props
}: ListBoxProps<T>) {
  return (
    <RACListBox<T> className={clsx(menuClassName, className)} {...props} />
  );
}

// A list box is a menu that happens to hold options: same surface, same rows,
// same separator, all of them defined in `Menu`.
export {
  MenuItemIcon as ListBoxItemIcon,
  MenuSeparator as ListBoxSeparator,
} from "./Menu";

export function ListBoxItem(
  props: ListBoxItemProps & {
    children: React.ReactNode;
  },
) {
  const { className, children, ...restProps } = props;
  return (
    <RACListBoxItem
      className={clsx(
        className,
        getMenuItemClassName({ href: props.href }),
        // The check mark sits outside the label and needs its own room; a menu
        // item's icon brings its own margin instead.
        "gap-2",
      )}
      {...restProps}
    >
      <CheckIcon className="size-4 shrink-0 opacity-0 not-in-[[role=listbox]]:hidden group-aria-selected/menu-item:opacity-100" />
      {/* The label ellipsizes rather than overflow: the same markup renders as
          the value of a select, where the available width is the button's. */}
      <div className="flex min-w-0 items-center whitespace-nowrap has-[[slot=description]]:flex-wrap **:[[slot=label]]:truncate">
        {children}
      </div>
    </RACListBoxItem>
  );
}

export function ListBoxItemLabel(props: { children: React.ReactNode }) {
  return <Text slot="label" {...props} />;
}

export function ListBoxItemDescription(props: { children: React.ReactNode }) {
  return (
    <>
      <div className="h-0 basis-full" />
      <Text
        slot="description"
        className="text-low font-normal whitespace-normal"
        {...props}
      />
    </>
  );
}
