import { Button as AriakitButton } from "ariakit/button";
import type { ButtonProps as AriakitButtonProps } from "ariakit/button";
import { clsx } from "clsx";
import { forwardRef } from "react";

export type ButtonColor = "primary" | "neutral";
export type ButtonVariant = "contained" | "outline";

export interface ButtonProps extends AriakitButtonProps<"button"> {
  color?: ButtonColor;
  variant?: ButtonVariant;
}

const variantClassNames: Record<ButtonVariant, Record<ButtonColor, string>> = {
  contained: {
    primary:
      "color-white border-transparent bg-primary-600 hover:bg-primary-700 active:bg-primary-800 aria-expanded:bg-primary-800",
    neutral:
      "color-white border-transparent bg-neutral-600 hover:bg-neutral-700 active:bg-neutral-800 aria-expanded:bg-neutral-800",
  },
  outline: {
    primary:
      "text-primary-100 border-primary-100 hover:text-primary-300 hover:border-primary-300 bg-transparent",
    neutral:
      "text-neutral-100 border-neutral-100 hover:text-neutral-300 hover:border-neutral-300 bg-transparent",
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { color = "primary", variant = "contained", children, className, ...props },
    ref
  ) => {
    const colorClassNames = variantClassNames[variant];
    if (!colorClassNames) {
      throw new Error(`Invalid variant: ${variant}`);
    }
    const variantClassName = colorClassNames[color];
    if (!variantClassName) {
      throw new Error(`Invalid color: ${color}`);
    }
    return (
      <AriakitButton
        ref={ref}
        as="button"
        className={clsx(
          className,
          variantClassName,
          "align-center inline-flex whitespace-nowrap rounded-lg border py-2 px-3 font-sans text-sm font-medium leading-none transition disabled:opacity-40 [&:is(button)]:cursor-default"
        )}
        {...props}
      >
        {children}
      </AriakitButton>
    );
  }
);
