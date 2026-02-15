import { Children, cloneElement, useState } from "react";
import { clsx } from "clsx";
import {
  Button as RACButton,
  ButtonProps as RACButtonProps,
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";
import { toast } from "sonner";

import { getErrorMessage } from "@/util/error";

import { Loader } from "./Loader";

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
    "data-[focus-visible]:ring-default text-default border bg-transparent data-[hovered]:bg-hover data-[hovered]:border-hover data-[pressed]:bg-active",
  destructive:
    "data-[focus-visible]:ring-danger text-white border-transparent bg-danger-solid data-[hovered]:bg-danger-solid-hover data-[pressed]:bg-danger-solid-active aria-expanded:bg-danger-solid-active",
  github:
    "data-[focus-visible]:ring-default text-white border-transparent bg-github data-[hovered]:bg-github-hover data-[pressed]:bg-github-active aria-expanded:bg-github-active",
  gitlab:
    "data-[focus-visible]:ring-default text-white border-transparent bg-gitlab data-[hovered]:bg-gitlab-hover data-[pressed]:bg-gitlab-active aria-expanded:bg-gitlab-active",
  google:
    "data-[focus-visible]:ring-default text-default border-transparent bg-google data-[hovered]:bg-google-hover data-[pressed]:bg-google-active aria-expanded:bg-google-active ring-1 ring-google",
};

const sizeClassNames: Record<ButtonSize, string> = {
  small: "rounded-sm py-1 px-2 text-xs",
  medium: "rounded-lg py-[calc(0.375rem-1px)] px-3 text-sm",
  large: "rounded-xl py-3 px-8 text-base",
};

function getButtonClassName(options: {
  variant: ButtonVariant;
  size: ButtonSize;
}) {
  const { variant, size } = options;
  const variantClassName = variantClassNames[variant];
  const sizeClassName = sizeClassNames[size];
  return clsx(
    "group/button",
    variantClassName,
    sizeClassName,
    "focus:outline-hidden data-focus-visible:ring-4",
    "items-center inline-flex select-none whitespace-nowrap border font-sans font-medium",
    "aria-disabled:opacity-disabled aria-disabled:cursor-not-allowed",
    "disabled:opacity-disabled disabled:cursor-not-allowed",
  );
}

function getButtonProps(options: ButtonOptions) {
  const { variant = "primary", size = "medium" } = options;
  return {
    className: getButtonClassName({ variant, size }),
    "data-size": size ?? "medium",
  };
}

export interface ButtonProps
  extends
    RACButtonProps,
    ButtonOptions,
    React.RefAttributes<HTMLButtonElement> {
  /**
   * Run an asynchronous action when the button is pressed.
   * Automatically set the button in pending mode and
   * handles errors.
   * @example
   * <Button
   *   onAction={async () => {
   *     await resetLink();
   *   }}
   * >
   *  Reset link
   * </Button>
   */
  onAction?: () => Promise<void>;
}

export function Button({
  className,
  variant,
  size,
  children,
  onAction,
  onPress,
  ...props
}: ButtonProps) {
  const buttonProps = getButtonProps({ variant, size });
  const [isPending, setIsPending] = useState(false);
  return (
    <RACButton
      {...buttonProps}
      className={clsx(buttonProps.className, "cursor-default", className)}
      isPending={props.isPending ?? isPending}
      onPress={(event) => {
        onPress?.(event);
        const promise = onAction?.();
        if (promise) {
          setIsPending(true);
          promise
            .catch((error) => {
              toast.error(getErrorMessage(error));
            })
            .finally(() => {
              setIsPending(false);
            });
        }
      }}
      {...props}
    >
      {(renderProps) => {
        const childrenRes =
          typeof children === "function" ? children(renderProps) : children;
        if (renderProps.isPending) {
          return (
            <>
              <ButtonIcon>
                <Loader delay={0} />
              </ButtonIcon>
              {childrenRes}
            </>
          );
        }
        return childrenRes;
      }}
    </RACButton>
  );
}

export interface LinkButtonProps
  extends RACLinkProps, ButtonOptions, React.RefAttributes<HTMLAnchorElement> {}

export function LinkButton({
  ref,
  className,
  variant,
  size,
  ...props
}: LinkButtonProps) {
  const buttonProps = getButtonProps({ variant, size });
  return (
    <RACLink
      ref={ref}
      {...buttonProps}
      className={clsx(buttonProps.className, className)}
      {...props}
    />
  );
}

export function ButtonIcon({
  children,
  position = "left",
  className,
}: {
  children: React.ReactElement<{
    className?: string;
    "aria-hidden"?: React.AriaAttributes["aria-hidden"];
  }>;
  position?: "left" | "right";
  className?: string;
}) {
  return cloneElement(Children.only(children), {
    "aria-hidden": true,
    className: clsx(
      children.props.className,
      "size-[1em]",
      "group-data-[size=small]/button:my-0.5",
      "group-data-[size=medium]/button:my-[0.1875rem]",
      "group-data-[size=large]/button:my-1",
      position === "left" &&
        clsx(
          "group-data-[size=small]/button:mr-1.5",
          "group-data-[size=medium]/button:mr-2",
          "group-data-[size=large]/button:mr-2.5",
        ),
      position === "right" &&
        clsx(
          "group-data-[size=small]/button:ml-1.5",
          "group-data-[size=medium]/button:ml-2",
          "group-data-[size=large]/button:ml-2.5",
        ),
      className,
    ),
  });
}
