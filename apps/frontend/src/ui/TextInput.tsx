import { ComponentPropsWithRef, type RefAttributes } from "react";
import { clsx } from "clsx";
import { Input, InputProps } from "react-aria-components";

type TextInputScale = "sm" | "md" | "lg";

export interface TextInputProps
  extends InputProps, RefAttributes<HTMLInputElement> {
  scale?: TextInputScale;
}

const sizeClassNames: Record<TextInputScale, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg leading-tight",
  md: "text-base px-3 py-1.5 rounded-lg leading-tight",
  lg: "text-base p-3 rounded-xl",
};

export function TextInput(props: TextInputProps) {
  const { scale = "md", ...rest } = props;
  return (
    <Input
      {...rest}
      className={clsx(
        rest.className,
        "peer/input",
        "search-cancel:hidden",
        "bg-app text-default border-thin block w-full appearance-none",
        "placeholder:text-placeholder",
        /* Hover */
        "not-disabled:hover:border-hover",
        /* Focus: the border marks the field however it was reached, the ring
           only when it was reached by keyboard. CSS `:focus-visible` cannot
           draw that line — a text input matches it on a plain click too — so
           the ring keys off react-aria's own modality tracking instead. */
        "focus:border-active focus:outline-hidden",
        "data-focus-visible:ring-primary-active data-focus-visible:ring-2",
        /* Invalid: red all the way through, ring included. */
        "aria-invalid:border-danger aria-invalid:focus:border-danger-active aria-invalid:not-disabled:hover:border-danger-hover",
        "aria-invalid:data-focus-visible:ring-danger-active",
        /* Disabled */
        "disabled:opacity-disabled",
        /* Addon  */
        "group-has-[.addon:first-child]/text-input-group:rounded-l-none",
        "group-has-[.addon:last-child]/text-input-group:rounded-r-none",
        /* Icon */
        "peer-first/icon:pl-9",
        /* Scale */
        sizeClassNames[scale],
      )}
      {...(props.autoComplete === "off"
        ? {
            "data-1p-ignore": "true",
            "data-lpignore": "true",
            "data-protonpass-ignore": "true",
          }
        : {})}
    />
  );
}

export function TextInputGroup(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "group/text-input-group relative flex items-stretch",
        props.className,
      )}
    />
  );
}

export function TextInputIcon(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "peer/icon text-placeholder pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&>svg]:size-4",
        props.className,
      )}
    />
  );
}

export function TextInputAddon(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "addon bg-ui text-low border-thin flex items-center justify-center px-2 text-sm whitespace-nowrap select-none",
        "first:rounded-l-lg first:border-r-0 last:rounded-r-lg last:border-l-0",
        props.className,
      )}
    />
  );
}
