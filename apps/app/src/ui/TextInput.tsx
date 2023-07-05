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
          "focus:shadow-outline block w-full appearance-none rounded border bg-slate-900 px-3 py-2 leading-tight text-on shadow invalid:border-danger-800 focus:outline-none disabled:opacity-disabled aria-invalid:border-danger-800"
        )}
        {...props}
      />
    );
  }
);
