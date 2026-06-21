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
  | "ghost"
  | "destructive"
  | "github"
  | "gitlab"
  | "google";
export type ButtonSize = "medium" | "small" | "large";

type ButtonOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Render the button as a square containing only an icon.
   * When using `iconOnly`, pass the icon directly as `children`
   * (do not wrap it in `ButtonIcon`).
   */
  iconOnly?: boolean;
  /** Fully round the edges (pill shape) instead of the default rounded corners. */
  rounded?: boolean;
  /**
   * Show the focus ring whenever the button is focused, not only when it is
   * `focus-visible`. Use it to make an autofocused default action visible even
   * to pointer users, so they can see which button Enter will trigger.
   */
  showFocusRing?: boolean;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "text-white border-transparent bg-primary-solid data-hovered:bg-primary-solid-hover data-pressed:bg-primary-solid-active aria-expanded:bg-primary-solid-active group-[*]/button-group:not-first:border-l-white/20",
  secondary:
    "text-default border bg-transparent data-hovered:bg-hover data-hovered:border-hover data-pressed:bg-active",
  ghost:
    "text-default border-transparent bg-transparent data-hovered:bg-hover data-pressed:bg-active aria-expanded:bg-active",
  destructive:
    "text-white border-transparent bg-danger-solid data-hovered:bg-danger-solid-hover data-pressed:bg-danger-solid-active aria-expanded:bg-danger-solid-active group-[*]/button-group:not-first:border-l-white/20",
  github:
    "text-white border-transparent bg-github data-hovered:bg-github-hover data-pressed:bg-github-active aria-expanded:bg-github-active group-[*]/button-group:not-first:border-l-white/20",
  gitlab:
    "text-white border-transparent bg-gitlab data-hovered:bg-gitlab-hover data-pressed:bg-gitlab-active aria-expanded:bg-gitlab-active group-[*]/button-group:not-first:border-l-white/20",
  google:
    "text-default border-transparent bg-google data-hovered:bg-google-hover data-pressed:bg-google-active aria-expanded:bg-google-active ring-1 ring-google group-[*]/button-group:not-first:border-l-black/15",
};

const sizeClassNames: Record<ButtonSize, string> = {
  small: "py-1 px-2 text-xs",
  medium: "py-[calc(0.375rem-1px)] px-3 text-sm",
  large: "py-3 px-8 text-base",
};

// Keep the same vertical padding as the regular sizes so an iconOnly button
// matches the height of a text button (e.g. when placed in a ButtonGroup), and
// mirror it horizontally so the button stays a perfect square around the
// `size-[1em]` icon.
const iconOnlySizeClassNames: Record<ButtonSize, string> = {
  small: "py-1 px-1 text-xs",
  medium: "py-[calc(0.375rem-1px)] px-[calc(0.375rem-1px)] text-sm",
  large: "py-3 px-3 text-base",
};

// Ring color per variant, the single source of truth for both the
// keyboard-focus ring (`data-focus-visible`) and the always-on ring drawn by
// `showFocusRing` (`data-focused`, e.g. an autofocused default action). Keeping
// the two states side by side stops them from drifting apart; the values are
// full literals so Tailwind keeps generating the classes.
const ringClassNames: Record<
  ButtonVariant,
  { focusVisible: string; focused: string }
> = {
  primary: {
    focusVisible: "data-focus-visible:ring-primary",
    focused: "data-focused:ring-primary",
  },
  secondary: {
    focusVisible: "data-focus-visible:ring-default",
    focused: "data-focused:ring-default",
  },
  ghost: {
    focusVisible: "data-focus-visible:ring-default",
    focused: "data-focused:ring-default",
  },
  destructive: {
    focusVisible: "data-focus-visible:ring-danger",
    focused: "data-focused:ring-danger",
  },
  github: {
    focusVisible: "data-focus-visible:ring-default",
    focused: "data-focused:ring-default",
  },
  gitlab: {
    focusVisible: "data-focus-visible:ring-default",
    focused: "data-focused:ring-default",
  },
  google: {
    focusVisible: "data-focus-visible:ring-default",
    focused: "data-focused:ring-default",
  },
};

// Default corner rounding per size (overridden by `rounded` for a pill shape).
const roundingClassNames: Record<ButtonSize, string> = {
  small: "rounded-sm",
  medium: "rounded-lg",
  large: "rounded-xl",
};

function getButtonClassName(options: {
  variant: ButtonVariant;
  size: ButtonSize;
  iconOnly: boolean;
  rounded: boolean;
  showFocusRing: boolean;
}) {
  const { variant, size, iconOnly, rounded, showFocusRing } = options;
  const variantClassName = variantClassNames[variant];
  const ring = ringClassNames[variant];
  const sizeClassName = (iconOnly ? iconOnlySizeClassNames : sizeClassNames)[
    size
  ];
  return clsx(
    "group/button",
    variantClassName,
    sizeClassName,
    ring.focusVisible,
    showFocusRing && ["data-focused:ring-4", ring.focused],
    rounded ? "rounded-full" : roundingClassNames[size],
    // ButtonGroup integration: drop the inner rounded corners and overlap
    // adjacent borders so each variant's `border-l-*` acts as the separator.
    "group-[*]/button-group:not-first:rounded-l-none",
    "group-[*]/button-group:not-last:rounded-r-none",
    "group-[*]/button-group:not-first:-ml-px",
    iconOnly && "*:size-[1em] justify-center",
    "focus:outline-hidden data-focus-visible:ring-4",
    "items-center inline-flex select-none whitespace-nowrap border font-sans font-medium",
    "aria-disabled:opacity-disabled aria-disabled:cursor-not-allowed",
    "disabled:opacity-disabled disabled:cursor-not-allowed",
  );
}

function getButtonProps(options: ButtonOptions) {
  const {
    variant = "primary",
    size = "medium",
    iconOnly = false,
    rounded = false,
    showFocusRing = false,
  } = options;
  return {
    className: getButtonClassName({
      variant,
      size,
      iconOnly,
      rounded,
      showFocusRing,
    }),
    "data-size": size ?? "medium",
    "data-icon-only": iconOnly ? "true" : undefined,
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
  iconOnly,
  rounded,
  showFocusRing,
  children,
  onAction,
  onPress,
  ...props
}: ButtonProps) {
  const buttonProps = getButtonProps({
    variant,
    size,
    iconOnly,
    rounded,
    showFocusRing,
  });
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
          if (iconOnly) {
            return <Loader delay={0} />;
          }
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
  iconOnly,
  rounded,
  showFocusRing,
  ...props
}: LinkButtonProps) {
  const buttonProps = getButtonProps({
    variant,
    size,
    iconOnly,
    rounded,
    showFocusRing,
  });
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
      "group-data-[size=medium]/button:my-0.75",
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
      // iconOnly buttons have no sibling text, so the horizontal margin would
      // off-center the icon. Force it off regardless of size/position.
      "group-data-icon-only/button:mx-0!",
      className,
    ),
  });
}
