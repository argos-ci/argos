import { Children, cloneElement, useState } from "react";
import { clsx } from "clsx";
import {
  Button as RACButton,
  ButtonProps as RACButtonProps,
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";

import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

import { Loader } from "./Loader";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "destructive"
  | "github"
  | "gitlab"
  | "google";
export type ButtonSize = "medium" | "small" | "large";

type ButtonOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Render the button as a circle containing only an icon.
   * When using `iconOnly`, pass the icon directly as `children`
   * (do not wrap it in `ButtonIcon`).
   */
  iconOnly?: boolean;
  /**
   * Show the focus ring whenever the button is focused, not only when it is
   * `focus-visible`. Use it to make an autofocused default action visible even
   * to pointer users, so they can see which button Enter will trigger.
   */
  showFocusRing?: boolean;
};

/**
 * Icons a step back from the label, forward again on hover. `*:` reaches the
 * icon because `ButtonIcon` clones it as a direct child, and an `iconOnly`
 * button's icon is its only child.
 */
const ICON_STEPS_BACK = clsx(
  "*:data-colored-icon:text-low data-hovered:*:data-colored-icon:text-default",
);

/**
 * The edge of a quiet button — the hairline `shadow-control` draws, tinted
 * through `edge-*`. Hovering darkens it, which is the clearest signal such a
 * button has — except inside a `ButtonGroup`, where the group reads as one
 * control and a hovered segment would draw a box around itself, seams and all.
 * There the fill carries the hover on its own.
 */
const EDGE = clsx(
  "edge-default",
  "data-hovered:edge-hover",
  "group-[*]/button-group:data-hovered:edge-default",
);

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-primary-solid data-hovered:bg-primary-solid-hover data-pressed:bg-primary-solid-active aria-expanded:bg-primary-solid-active",
  // A wash rather than a fill: `bg-ui` at half opacity lifts the button off
  // whatever it sits on — the app background, a panel, an image — without
  // reading as a filled button next to `primary`. Icons sit one step back from
  // the label and come forward on hover, so a row of icon buttons stays quiet
  // until it is pointed at.
  secondary: clsx(
    "text-default bg-raised data-hovered:bg-raised-hover data-pressed:bg-raised-active",
    EDGE,
    ICON_STEPS_BACK,
    // Pressed, the fill stays put and only the icon brightens on hover: moving
    // the fill as well made a control that is already on look like it was
    // about to change.
    "aria-pressed:bg-raised-active aria-pressed:data-hovered:bg-raised-active aria-pressed:text-default",
    "aria-expanded:bg-raised-active",
  ),
  // No fill at rest, and the same "on" fill as `secondary` once it has one, so
  // a toolbar mixing the two never shows the state two shades apart.
  ghost: clsx(
    "text-default bg-transparent data-hovered:bg-hover data-pressed:bg-raised-active",
    ICON_STEPS_BACK,
    // Pressed, the fill stays put and only the icon brightens on hover: moving
    // the fill as well made a control that is already on look like it was
    // about to change.
    "aria-pressed:bg-raised-active aria-pressed:data-hovered:bg-raised-active aria-pressed:text-default",
    "aria-expanded:bg-raised-active",
  ),
  // The quiet colored actions — approve, reject, delete — as opposed to
  // `destructive`, which is a solid call to action. The color is in the icon and
  // the label, and only fills in on hover.
  danger: clsx(
    "text-danger-low bg-raised data-hovered:bg-danger-hover/50 data-pressed:bg-danger-active",
    "edge-default data-hovered:edge-danger-hover group-[*]/button-group:data-hovered:edge-default",
    "aria-pressed:bg-danger-active aria-pressed:edge-danger aria-pressed:data-hovered:bg-danger-active aria-pressed:data-hovered:text-danger",
  ),
  success: clsx(
    "text-success-low bg-raised data-hovered:bg-success-hover/50 data-pressed:bg-success-active",
    "edge-default data-hovered:edge-success-hover group-[*]/button-group:data-hovered:edge-default",
    "aria-pressed:bg-success-active aria-pressed:data-hovered:bg-success-active aria-pressed:data-hovered:text-success",
  ),
  destructive:
    "text-white bg-danger-solid data-hovered:bg-danger-solid-hover data-pressed:bg-danger-solid-active aria-expanded:bg-danger-solid-active",
  github:
    "text-white bg-github data-hovered:bg-github-hover data-pressed:bg-github-active aria-expanded:bg-github-active",
  gitlab:
    "text-white bg-gitlab data-hovered:bg-gitlab-hover data-pressed:bg-gitlab-active aria-expanded:bg-gitlab-active",
  // The only fill that is the page color itself, so the hairline is the whole
  // of the button's shape — it takes the same gray as a quiet button rather
  // than the near-black the solid fills sit behind. It used to be a `ring-1`,
  // which the focus ring then had to fight with.
  google:
    "text-default edge-default bg-google data-hovered:bg-google-hover data-pressed:bg-google-active aria-expanded:bg-google-active",
};

// With the edge out of the layout, the line box and the padding are the whole
// height: 24 / 32 / 48px.
const sizeClassNames: Record<ButtonSize, string> = {
  small: "py-1 px-2 text-xs",
  medium: "py-1.5 px-3 text-sm",
  large: "py-3 px-8 text-base",
};

// An iconOnly button is a circle as tall as a text button of the same size, so
// the two line up side by side (in a ButtonGroup or just next to each other).
// Its icon is a step larger than the label's `1em` — an icon carrying a meaning
// on its own needs the room — and the padding makes up the rest of the height:
// `(text height − icon) / 2`.
const iconOnlySizeClassNames: Record<ButtonSize, string> = {
  // 24px tall: 14px icon + 2×5px
  small: "p-1.25 *:size-3.5 text-xs",
  // 32px tall: 16px icon + 2×8px
  medium: "p-2 *:size-4 text-sm",
  // 48px tall: 20px icon + 2×14px
  large: "p-3.5 *:size-5 text-base",
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
  danger: {
    focusVisible: "data-focus-visible:ring-danger",
    focused: "data-focused:ring-danger",
  },
  success: {
    focusVisible: "data-focus-visible:ring-success",
    focused: "data-focused:ring-success",
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

/**
 * The button surface — shape, hairline, fill, focus ring. Exported for the
 * controls that must read as buttons without being one, such as the pill tabs:
 * they share this so a row of them lines up with a row of buttons.
 */
export function getButtonClassName(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  showFocusRing?: boolean;
}) {
  const {
    variant = "primary",
    size = "medium",
    iconOnly = false,
    showFocusRing = false,
  } = options;
  const variantClassName = variantClassNames[variant];
  const ring = ringClassNames[variant];
  const sizeClassName = (iconOnly ? iconOnlySizeClassNames : sizeClassNames)[
    size
  ];
  return clsx(
    "group/button",
    // The edge and the lift in one shadow, no border: the hairline draws the
    // button's shape without framing it or taking up layout, and each variant
    // tints it through `edge-*`. A button that is on keeps its edge and loses
    // the lift — pressed in rather than standing off the surface. `ghost` is
    // the exception, and the exception is the point of it: no edge at all, so
    // nothing marks it out until it is hovered.
    variant !== "ghost" && "shadow-control aria-pressed:shadow-control-flat",
    variantClassName,
    sizeClassName,
    ring.focusVisible,
    showFocusRing && ["data-focused:ring-4", ring.focused],
    "rounded-full",
    // ButtonGroup integration: drop the inner rounded ends so the segments butt
    // together, and where they meet each one's hairline draws the seam.
    "group-[*]/button-group:not-first:rounded-l-none",
    "group-[*]/button-group:not-last:rounded-r-none",
    iconOnly && "justify-center",
    "focus:outline-hidden data-focus-visible:ring-4",
    "items-center inline-flex select-none whitespace-nowrap font-sans font-medium",
    "aria-disabled:opacity-disabled aria-disabled:cursor-not-allowed",
    "disabled:opacity-disabled disabled:cursor-not-allowed",
  );
}

function getButtonProps(options: ButtonOptions) {
  const {
    variant = "primary",
    size = "medium",
    iconOnly = false,
    showFocusRing = false,
  } = options;
  return {
    className: getButtonClassName({
      variant,
      size,
      iconOnly,
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
  showFocusRing,
  ...props
}: LinkButtonProps) {
  const buttonProps = getButtonProps({
    variant,
    size,
    iconOnly,
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

export type ButtonIconElementProps = {
  className?: string;
  "aria-hidden"?: React.AriaAttributes["aria-hidden"];
  "data-colored-icon"?: true;
};

export function ButtonIcon({
  children,
  position = "left",
  className,
  colorClassName,
}: {
  children: React.ReactElement<ButtonIconElementProps>;
  position?: "left" | "right";
  className?: string;
  colorClassName?: string;
}) {
  return cloneElement(Children.only(children), {
    "aria-hidden": true,
    "data-colored-icon": colorClassName ? undefined : true,
    className: clsx(
      children.props.className,
      colorClassName,
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
