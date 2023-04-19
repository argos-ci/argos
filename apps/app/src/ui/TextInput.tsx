import { clsx } from "clsx";
import { ComponentProps, forwardRef } from "react";

export const TextInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          className,
          "focus:shadow-outline appearance-none rounded border border-border bg-slate-900 px-3 py-2 leading-tight text-on shadow invalid:border-red-800 focus:outline-none"
        )}
        {...props}
      />
    );
  }
);
