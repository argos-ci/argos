import { Children, cloneElement, forwardRef, memo } from "react";
import { Button as AriakitButton } from "ariakit/button";
import type { ButtonProps as AriakitButtonProps } from "ariakit/button";
import { clsx } from "clsx";
import { ChevronDownIcon } from "lucide-react";

export type ButtonColor =
  | "primary"
  | "danger"
  | "neutral"
  | "github"
  | "gitlab"
  | "google";
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
    google:
      "focus-visible:ring-default text border-transparent bg-google [&:not([aria-disabled])]:hover:bg-google-hover [&:not([aria-disabled])]:active:bg-google-active aria-expanded:bg-google-active ring-1 ring-google",
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
    google: "", // not used
  },
};

const sizeClassNames: Record<ButtonSize, string> = {
  base: "group/button-base rounded-lg py-1.5 px-3 text-sm",
  small: "group/button-small rounded py-1 px-2 text-xs",
  large: "group/button-large rounded py-3 px-8 text-base",
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
    const variantClassName = colorClassNames[color];
    const sizeClassName = sizeClassNames[size];
    return (
      <AriakitButton
        ref={ref}
        as="button"
        className={clsx(
          className,
          variantClassName,
          sizeClassName,
          "focus:outline-none focus-visible:ring-4",
          "align-center aria-disabled:opacity-disabled inline-flex select-none whitespace-nowrap border font-sans font-medium transition [&:is(button)]:cursor-default",
        )}
        {...props}
      >
        {children}
      </AriakitButton>
    );
  },
);

export const ButtonIcon = ({
  children,
  position = "left",
  className,
}: {
  children: React.ReactElement;
  position?: "left" | "right";
  className?: string;
}) => {
  return cloneElement(Children.only(children), {
    "aria-hidden": true,
    className: clsx(
      "size-[1em]",
      "group-[]/button-base:my-[0.1875rem]",
      "group-[]/button-small:my-0.5",
      "group-[]/button-large:my-1",
      position === "left" &&
        clsx(
          "group-[]/button-base:mr-2",
          "group-[]/button-small:mr-1.5",
          "group-[]/button-large:mr-2.5",
        ),
      position === "right" &&
        clsx(
          "group-[]/button-base:ml-2",
          "group-[]/button-small:ml-1.5",
          "group-[]/button-large:ml-2.5",
        ),
      className,
    ),
  });
};

export const ButtonArrow = memo(() => {
  return (
    <ButtonIcon position="right">
      <ChevronDownIcon />
    </ButtonIcon>
  );
});
