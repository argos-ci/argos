import { clsx } from "clsx";
import { forwardRef } from "react";

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          className,
          "block w-full appearance-none rounded border bg-app px-3 py-2 leading-tight text invalid:border-danger hover:border-hover focus:border-active focus:outline-none disabled:opacity-disabled aria-invalid:border-danger"
        )}
        {...props}
      />
    );
  }
);
