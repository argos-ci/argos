import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { Button as AriakitButton } from "ariakit/button";
import type { ButtonProps as AriakitButtonProps } from "ariakit/button";
import { clsx } from "clsx";
import { Children, cloneElement, forwardRef, memo } from "react";

export type ButtonColor = "primary" | "danger" | "neutral";
export type ButtonVariant = "contained" | "outline";
export type ButtonSize = "base" | "small" | "large";

export type ButtonProps = AriakitButtonProps<"button"> & {
  color?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClassNames: Record<ButtonVariant, Record<ButtonColor, string>> = {
  contained: {
    primary:
      "text-white border-transparent bg-primary-600 [&:not([aria-disabled])]:hover:bg-primary-700 active:bg-primary-800 aria-expanded:bg-primary-800",
    danger:
      "text-white border-transparent bg-danger-600 [&:not([aria-disabled])]:hover:bg-danger-700 active:bg-danger-800 aria-expanded:bg-danger-800",
    neutral:
      "text-white border-transparent bg-neutral-600 [&:not([aria-disabled])]:hover:bg-neutral-700 active:bg-neutral-800 aria-expanded:bg-neutral-800",
  },
  outline: {
    primary:
      "text-primary-100 border-primary-100 bg-transparent [&:not([aria-disabled])]:hover:border-primary-300 [&:not([aria-disabled])]:hover:text-primary-300",
    danger:
      "text-danger-300 border-danger-300 bg-transparent [&:not([aria-disabled])]:hover:bg-danger-800",
    neutral:
      "text-neutral-300 border-neutral-600 bg-transparent [&:not([aria-disabled])]:hover:bg-neutral-800",
  },
};

const sizeClassNames: Record<ButtonSize, string> = {
  base: "rounded-lg py-2 px-3 text-sm",
  small: "rounded py-1 px-2 text-xs leading-4",
  large: "rounded py-4 px-8 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      color = "primary",
      variant = "contained",
      size = "base",
      children,
      className,
      ...props
    },
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
    const sizeClassName = sizeClassNames[size];
    if (!sizeClassName) {
      throw new Error(`Invalid size: ${color}`);
    }
    return (
      <AriakitButton
        ref={ref}
        as="button"
        className={clsx(
          className,
          variantClassName,
          sizeClassName,
          "align-center inline-flex whitespace-nowrap border font-sans font-medium leading-none transition aria-disabled:opacity-70 [&:is(button)]:cursor-default"
        )}
        {...props}
      >
        {children}
      </AriakitButton>
    );
  }
);

export interface ButtonIconProps {
  children: React.ReactElement;
}

export const ButtonIcon = ({ children }: ButtonIconProps) => {
  return cloneElement(Children.only(children), {
    className: "h-[1em] w-[1em] mr-2",
  });
};

export const ButtonArrow = memo(() => {
  return <ChevronDownIcon className="ml-2 mr-[-4px] h-[1em] w-[1em]" />;
});
