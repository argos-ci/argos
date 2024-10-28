import { Children, cloneElement, forwardRef } from "react";
import { clsx } from "clsx";
import {
  Button as RACButton,
  ButtonProps as RACButtonProps,
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "github"
  | "gitlab"
  | "google";
export type ButtonSize = "medium" | "small" | "large";

type ButtonOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "data-[focus-visible]:ring-primary text-white border-transparent bg-primary-solid data-[hovered]:bg-primary-solid-hover data-[pressed]:bg-primary-solid-active aria-expanded:bg-primary-solid-active",
  secondary:
    "data-[focus-visible]:ring-default text border bg-transparent data-[hovered]:bg-hover data-[hovered]:border-hover",
  destructive:
    "data-[focus-visible]:ring-danger text-white border-transparent bg-danger-solid data-[hovered]:bg-danger-solid-hover data-[pressed]:bg-danger-solid-active aria-expanded:bg-danger-solid-active",
  github:
    "data-[focus-visible]:ring-default text-white border-transparent bg-github data-[hovered]:bg-github-hover data-[pressed]:bg-github-active aria-expanded:bg-github-active",
  gitlab:
    "data-[focus-visible]:ring-default text-white border-transparent bg-gitlab data-[hovered]:bg-gitlab-hover data-[pressed]:bg-gitlab-active aria-expanded:bg-gitlab-active",
  google:
    "data-[focus-visible]:ring-default text border-transparent bg-google data-[hovered]:bg-google-hover data-[pressed]:bg-google-active aria-expanded:bg-google-active ring-1 ring-google",
};

const sizeClassNames: Record<ButtonSize, string> = {
  medium: "group/button-medium rounded-lg py-1.5 px-3 text-sm",
  small: "group/button-small rounded py-1 px-2 text-xs",
  large: "group/button-large rounded py-3 px-8 text-base",
};

function getButtonClassName(options: ButtonOptions) {
  const { variant = "primary", size = "medium" } = options;
  const variantClassName = variantClassNames[variant];
  const sizeClassName = sizeClassNames[size];
  return clsx(
    variantClassName,
    sizeClassName,
    "focus:outline-none data-[focus-visible]:ring-4",
    "items-center data-[disabled]:opacity-disabled inline-flex select-none whitespace-nowrap border font-sans font-medium transition data-[disabled]:cursor-default",
  );
}

export type ButtonProps = RACButtonProps & ButtonOptions;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    const buttonClassName = getButtonClassName({ variant, size });
    return (
      <RACButton
        ref={ref}
        className={clsx(buttonClassName, "cursor-default", className)}
        {...props}
      />
    );
  },
);

export type LinkButtonProps = RACLinkProps & ButtonOptions;

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    const buttonClassName = getButtonClassName({ variant, size });
    return (
      <RACLink
        ref={ref}
        className={clsx(buttonClassName, className)}
        {...props}
      />
    );
  },
);

export function ButtonIcon({
  children,
  position = "left",
  className,
}: {
  children: React.ReactElement;
  position?: "left" | "right";
  className?: string;
}) {
  return cloneElement(Children.only(children), {
    "aria-hidden": true,
    className: clsx(
      "size-[1em]",
      "group-[]/button-small:my-0.5",
      "group-[]/button-medium:my-[0.1875rem]",
      "group-[]/button-large:my-1",
      position === "left" &&
        clsx(
          "group-[]/button-small:mr-1.5",
          "group-[]/button-medium:mr-2",
          "group-[]/button-large:mr-2.5",
        ),
      position === "right" &&
        clsx(
          "group-[]/button-small:ml-1.5",
          "group-[]/button-medium:ml-2",
          "group-[]/button-large:ml-2.5",
        ),
      className,
    ),
  });
}
