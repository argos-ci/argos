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
      )}
    />
  );
}
