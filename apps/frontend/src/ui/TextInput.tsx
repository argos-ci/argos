import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export type TextInputProps = ComponentPropsWithRef<"input">;

export function TextInput(props: TextInputProps) {
  return (
    <input
      {...props}
      className={clsx(
        props.className,
        "bg-app text-default [&:not([disabled])]:hover:border-hover focus:border-active disabled:opacity-disabled aria-invalid:border-danger focus:outline-hidden block w-full appearance-none rounded-sm border px-3 py-2 leading-tight",
        "group-[]/text-input:rounded-r-none",
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
        "bg-ui text-low flex select-none items-center rounded-r border border-l-0 p-2 text-sm",
        props.className,
      )}
    />
  );
}
