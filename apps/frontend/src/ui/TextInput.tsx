import { forwardRef } from "react";
import { clsx } from "clsx";

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          className,
          "bg-app text invalid:border-danger [&:not([disabled])]:hover:border-hover focus:border-active disabled:opacity-disabled aria-invalid:border-danger block w-full appearance-none rounded border px-3 py-2 leading-tight focus:outline-none",
        )}
        {...props}
      />
    );
  },
);
