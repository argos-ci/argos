import { clsx } from "clsx";
import { CheckIcon } from "lucide-react";
import {
  ListBoxItemProps,
  ListBoxProps,
  ListBox as RACListBox,
  ListBoxItem as RACListBoxItem,
  Separator,
  Text,
} from "react-aria-components";

export function ListBox<T extends object>({
  className,
  ...props
}: ListBoxProps<T>) {
  return (
    <RACListBox<T>
      className={clsx("overflow-auto p-1.5 outline-hidden", className)}
      {...props}
    />
  );
}

export function ListBoxSeparator() {
  return <Separator className="border-t-thin -mx-1.5 my-1.5" />;
}

export { MenuItemIcon as ListBoxItemIcon } from "./Menu";

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
        "group/item",
        "text-default data-focused:bg-active data-pressed:bg-active data-disabled:opacity-disabled flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm select-none focus:outline-hidden",
      )}
      {...restProps}
    >
      <CheckIcon className="size-4 shrink-0 opacity-0 not-in-[[role=listbox]]:hidden group-aria-selected/item:opacity-100" />
      {/* The label ellipsizes rather than overflow: the same markup renders as
          the value of a select, where the available width is the button's. */}
      <div className="flex min-w-0 items-center whitespace-nowrap has-[[slot=description]]:flex-wrap [&_[slot=label]]:truncate">
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
        className="text-low whitespace-normal"
        {...props}
      />
    </>
  );
}
