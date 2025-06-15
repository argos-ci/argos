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
      className={clsx("outline-hidden overflow-auto", className)}
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
        "text-default data-[focused]:bg-active data-[pressed]:bg-active data-[disabled]:opacity-disabled focus:outline-hidden flex select-none flex-wrap items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition",
      )}
      {...restProps}
    >
      <CheckIcon className="not-in-[[role=listbox]]:hidden size-4 opacity-0 group-aria-selected/item:opacity-100" />
      <div className="flex items-center">{children}</div>
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
