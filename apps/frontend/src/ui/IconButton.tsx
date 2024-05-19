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
      "[&:not([aria-disabled])]:hover:border-hover [&:not([aria-disabled])]:hover:bg-ui text-low [&:not([aria-disabled])]:hover:text bg-ui/60 focus-visible:ring-default",
    danger: "", // not used
    success: "", // not used
  },
  outline: {
    neutral:
      "[&:not([aria-disabled])]:hover:border-hover text-low aria-pressed:bg-active aria-pressed:text [&:not([aria-disabled])]:active:bg-active [&:not([aria-disabled])]:active:text focus-visible:ring-default",
    danger:
      "[&:not([aria-disabled])]:hover:border-danger-hover text-danger-low aria-pressed:bg-danger-active [&:not([aria-disabled])]:active:bg-danger-active focus-visible:ring-danger",
    success:
      "[&:not([aria-disabled])]:hover:border-success-hover text-success-low aria-pressed:bg-success-active [&:not([aria-disabled])]:active:bg-success-active focus-visible:ring-success",
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
    {
      color = "neutral",
      variant = "outline",
      children,
      asChild,
      onClick,
      disabled,
      ...props
    },
    ref,
  ) => {
    const variantClassName = colorClassNames[variant][color];
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        aria-disabled={disabled ? "true" : undefined}
        className={clsx(
          variantClassName,
          /* Group */
          "group-[]/button-group:rounded-none group-[]/button-group:first:rounded-l-lg group-[]/button-group:last:rounded-r-lg",
          /* Base */
          "aria-[disabled]:opacity-disabled flex h-8 cursor-default items-center gap-2 rounded-lg border border-transparent p-[7px] text-sm transition [&>*]:size-4",
          /* Focus */
          "focus:outline-none focus-visible:ring-4",
        )}
        onClick={(event) => {
          if (props["aria-disabled"] || disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
