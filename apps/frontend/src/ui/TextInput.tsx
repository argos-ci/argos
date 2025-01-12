import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export type TextInputProps = ComponentPropsWithRef<"input">;

export function TextInput(props: TextInputProps) {
  return (
    <input
      {...props}
      className={clsx(
        props.className,
        "bg-app text [&:not([disabled])]:hover:border-hover focus:border-active disabled:opacity-disabled aria-invalid:border-danger block w-full appearance-none rounded border px-3 py-2 leading-tight focus:outline-none",
        "group-[]/text-input:rounded-r-none group-[]/text-input:border-r-0",
      )}
    />
  );
}

export function TextInputGroup(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx("group/text-input flex items-stretch", props.className)}
    />
  );
}

export function TextInputAddon(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "bg-ui text-low flex select-none items-center rounded-r border p-2 text-sm",
        props.className,
      )}
    />
  );
}
