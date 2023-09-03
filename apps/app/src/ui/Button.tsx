import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { Button as AriakitButton } from "ariakit/button";
import type { ButtonProps as AriakitButtonProps } from "ariakit/button";
import { clsx } from "clsx";
import { Children, cloneElement, forwardRef, memo } from "react";

export type ButtonColor =
  | "primary"
  | "danger"
  | "neutral"
  | "github"
  | "gitlab";
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
      "focus-visible:ring-primary text-white border-transparent bg-primary-solid [&:not([aria-disabled])]:hover:bg-primary-solid-hover [&:not([aria-disabled])]:active:bg-primary-solid-active aria-expanded:bg-primary-solid-active",
    danger:
      "focus-visible:ring-danger text-white border-transparent bg-danger-solid [&:not([aria-disabled])]:hover:bg-danger-solid-hover [&:not([aria-disabled])]:active:bg-danger-solid-active aria-expanded:bg-danger-solid-active",
    neutral:
      "focus-visible:ring-default text-white border-transparent bg-solid [&:not([aria-disabled])]:hover:bg-solid-hover [&:not([aria-disabled])]:active:bg-solid-active aria-expanded:bg-solid-active",
    github:
      "focus-visible:ring-default text-white border-transparent bg-github [&:not([aria-disabled])]:hover:bg-github-hover [&:not([aria-disabled])]:active:bg-github-active aria-expanded:bg-github-active",
    gitlab:
      "focus-visible:ring-default text-white border-transparent bg-gitlab [&:not([aria-disabled])]:hover:bg-gitlab-hover [&:not([aria-disabled])]:active:bg-gitlab-active aria-expanded:bg-gitlab-active",
  },
  outline: {
    primary:
      "focus-visible:ring-primary text-primary border-primary bg-transparent [&:not([aria-disabled])]:hover:bg-primary-hover [&:not([aria-disabled])]:hover:border-primary-hover",
    danger:
      "focus-visible:ring-danger text-danger border-danger bg-transparent [&:not([aria-disabled])]:hover:bg-danger-hover [&:not([aria-disabled])]:hover:border-danger-hover",
    neutral:
      "focus-visible:ring-default text border bg-transparent [&:not([aria-disabled])]:hover:bg-hover [&:not([aria-disabled])]:hover:border-hover",
    github: "", // not used
    gitlab: "", // not used
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
    ref,
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
      throw new Error(`Invalid size: ${size}`);
    }
    return (
      <AriakitButton
        ref={ref}
        as="button"
        className={clsx(
          className,
          variantClassName,
          sizeClassName,
          "focus:outline-none focus-visible:ring-4",
          "align-center select-none inline-flex whitespace-nowrap border font-sans font-medium leading-none transition aria-disabled:opacity-disabled [&:is(button)]:cursor-default",
        )}
        {...props}
      >
        {children}
      </AriakitButton>
    );
  },
);

export interface ButtonIconProps {
  children: React.ReactElement;
}

export const ButtonIcon = ({ children }: ButtonIconProps) => {
  return cloneElement(Children.only(children), {
    "aria-hidden": true,
    className: "h-[1em] w-[1em] mr-2",
  });
};

export const ButtonArrow = memo(() => {
  return <ChevronDownIcon className="ml-2 mr-[-4px] h-[1em] w-[1em]" />;
});
