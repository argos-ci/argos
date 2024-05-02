import { ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";

type IconButtonVariant = "contained" | "outline";
type IconButtonColor = "danger" | "success" | "neutral";

const colorClassNames: Record<
  IconButtonVariant,
  Record<IconButtonColor, string>
> = {
  contained: {
    neutral:
      "hover:border-hover hover:bg-ui text-low hover:text bg-ui/60 focus-visible:ring-default",
    danger: "", // not used
    success: "", // not used
  },
  outline: {
    neutral:
      "hover:border-hover text-low aria-pressed:bg-active aria-pressed:text active:bg-active active:text focus-visible:ring-default",
    danger:
      "hover:border-danger-hover text-danger-low aria-pressed:bg-danger-active active:bg-danger-active focus-visible:ring-danger",
    success:
      "hover:border-success-hover text-success-low aria-pressed:bg-success-active active:bg-success-active focus-visible:ring-success",
  },
};

export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    color?: IconButtonColor;
    variant?: IconButtonVariant;
    children: React.ReactNode;
    asChild?: boolean;
  }
>(
  (
    { color = "neutral", variant = "outline", children, asChild, ...props },
    ref,
  ) => {
    const variantClassName = colorClassNames[variant][color];
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={clsx(
          variantClassName,
          /* Group */
          "group-[]/button-group:rounded-none group-[]/button-group:first:rounded-l-lg group-[]/button-group:last:rounded-r-lg",
          /* Base */
          "disabled:opacity-disabled flex h-8 cursor-default items-center gap-2 rounded-lg border border-transparent p-[7px] text-sm transition [&>*]:size-4",
          /* Focus */
          "focus:outline-none focus-visible:ring-4",
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
