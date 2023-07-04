import { clsx } from "clsx";
import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";

export type ButtonColor = "primary" | "neutral";
export type ButtonVariant = "contained" | "outline";
export type ButtonSize = "base" | "small" | "large";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

const variantClassNames: Record<ButtonVariant, Record<ButtonColor, string>> = {
  contained: {
    primary:
      "text-white border-transparent bg-primary-600 hover:bg-primary-700 active:bg-primary-800 aria-expanded:bg-primary-800",
    neutral:
      "text-white border-transparent bg-neutral-600 hover:bg-neutral-700 active:bg-neutral-800 aria-expanded:bg-neutral-800",
  },
  outline: {
    primary:
      "text-primary-100 border-primary-100 hover:text-primary-300 hover:border-primary-300 bg-transparent",
    neutral:
      "text-neutral-100 border-neutral-100 hover:text-neutral-300 hover:border-neutral-300 bg-transparent",
  },
};

const sizeClassNames: Record<ButtonSize, string> = {
  base: "rounded-lg py-2 px-3 text-sm leading-none",
  small: "rounded py-1 px-2 text-xs leading-4",
  large: "rounded py-2 px-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      color = "primary",
      variant = "contained",
      size = "base",
      children,
      className,
      asChild,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const colorClassNames = variantClassNames[variant];
    if (!colorClassNames) {
      throw new Error(`Invalid variant: ${variant}`);
    }
    const variantClassName = colorClassNames[color];
    if (!variantClassName) {
      throw new Error(`Invalid color: ${color}`);
    }
    const sizeClassName = sizeClassNames[size];
    if (!sizeClassName) {
      throw new Error(`Invalid size: ${color}`);
    }
    return (
      <Comp
        ref={ref}
        className={clsx(
          className,
          variantClassName,
          sizeClassName,
          "align-center inline-flex whitespace-nowrap border font-sans font-medium transition disabled:opacity-40 [&:is(button)]:cursor-default"
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
