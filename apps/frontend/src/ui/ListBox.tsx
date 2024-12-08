import { Children, cloneElement } from "react";
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
      className={clsx("overflow-auto outline-none", className)}
      {...props}
    />
  );
}

export function ListBoxSeparator() {
  return <Separator className="-mx-1 my-1 border-t" />;
}

export function ListBoxItemIcon(props: {
  children: React.ReactElement<{
    className?: string;
    "aria-hidden"?: React.AriaAttributes["aria-hidden"];
  }>;
  className?: string;
}) {
  return cloneElement(Children.only(props.children), {
    "aria-hidden": true,
    className: clsx("size-[1em]", props.className),
  });
}

export function ListBoxItem({
  children,
  className,
  ...props
}: ListBoxItemProps & {
  children: React.ReactNode;
}) {
  return (
    <RACListBoxItem
      className={clsx(
        className,
        "group/item",
        "text data-[focused]:bg-active data-[pressed]:bg-active data-[disabled]:opacity-disabled flex select-none flex-wrap items-center gap-x-2 rounded px-3 py-1.5 text-sm transition focus:outline-none",
      )}
      {...props}
    >
      <CheckIcon className="text size-4 opacity-0 group-aria-selected/item:opacity-100" />
      {children}
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
      <Text slot="description" className="text-low ml-6" {...props} />
    </>
  );
}
