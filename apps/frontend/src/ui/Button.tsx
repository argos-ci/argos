import {
  Children,
  cloneElement,
  useCallback,
  useRef,
  useState,
  type ComponentPropsWithRef,
} from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { clsx } from "clsx";

import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";
import { mergeRefs } from "@/util/merge-refs";

import { Loader } from "./Loader";
import { RouterLink } from "./RouterLink";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "destructive"
  | "github"
  | "gitlab"
  | "origin"
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
 * Icons a step back from the label, forward again on hover — or for good, once
 * the control is on. Hover alone is not enough there: an open trigger and a
 * chosen tab take no hover at all, so their icon would have stayed dimmed with
 * the menu sitting open beneath it. `*:` reaches the icon because `ButtonIcon`
 * clones it as a direct child, and an `iconOnly` button's icon is its only
 * child.
 */
const ICON_STEPS_BACK = clsx(
  "*:not-data-colored-icon:text-low enabled-hover:*:not-data-colored-icon:text-default on:*:not-data-colored-icon:text-default",
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
  "enabled-hover:edge-hover",
  "group-[*]/button-group:enabled-hover:edge-default",
);

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-primary-solid enabled-hover:bg-primary-solid-hover enabled-active:bg-primary-solid-active on:bg-primary-solid-active",
  // A wash rather than a fill: `bg-ui` at half opacity lifts the button off
  // whatever it sits on — the app background, a panel, an image — without
  // reading as a filled button next to `primary`. Icons sit one step back from
  // the label and come forward on hover, so a row of icon buttons stays quiet
  // until it is pointed at.
  secondary: clsx(
    "text-default bg-raised enabled-hover:bg-raised-hover enabled-active:bg-raised-active",
    EDGE,
    ICON_STEPS_BACK,
    // On, the fill stays put and only the icon brightens on hover: moving
    // the fill as well made a control that is already on look like it was
    // about to change.
    "on:bg-raised-active on:enabled-hover:bg-raised-active on:text-default",
  ),
  // No fill at rest, and the same "on" fill as `secondary` once it has one, so
  // a toolbar mixing the two never shows the state two shades apart.
  ghost: clsx(
    "text-default bg-transparent enabled-hover:bg-hover enabled-active:bg-raised-active",
    ICON_STEPS_BACK,
    // On, the fill stays put and only the icon brightens on hover: moving
    // the fill as well made a control that is already on look like it was
    // about to change.
    "on:bg-raised-active on:enabled-hover:bg-raised-active on:text-default",
  ),
  // The quiet colored actions — approve, reject, delete — as opposed to
  // `destructive`, which is a solid call to action. The color is in the icon and
  // the label, and only fills in on hover.
  danger: clsx(
    "text-danger-low bg-raised enabled-hover:bg-danger-hover/50 enabled-active:bg-danger-active",
    "edge-default enabled-hover:edge-danger-hover group-[*]/button-group:enabled-hover:edge-default",
    "on:bg-danger-active on:edge-danger on:enabled-hover:bg-danger-active on:enabled-hover:text-danger",
  ),
  success: clsx(
    "text-success-low bg-raised enabled-hover:bg-success-hover/50 enabled-active:bg-success-active",
    "edge-default enabled-hover:edge-success-hover group-[*]/button-group:enabled-hover:edge-default",
    "on:bg-success-active on:enabled-hover:bg-success-active on:enabled-hover:text-success",
  ),
  destructive:
    "text-white bg-danger-solid enabled-hover:bg-danger-solid-hover enabled-active:bg-danger-solid-active on:bg-danger-solid-active",
  github:
    "text-white bg-github enabled-hover:bg-github-hover enabled-active:bg-github-active on:bg-github-active",
  gitlab:
    "text-white bg-gitlab enabled-hover:bg-gitlab-hover enabled-active:bg-gitlab-active on:bg-gitlab-active",
  origin:
    "text-white bg-origin enabled-hover:bg-origin-hover enabled-active:bg-origin-active on:bg-origin-active",
  // The only fill that is the page color itself, so the hairline is the whole
  // of the button's shape — it takes the same gray as a quiet button rather
  // than the near-black the solid fills sit behind. It used to be a `ring-1`,
  // which the focus ring then had to fight with.
  google:
    "text-default edge-default bg-google enabled-hover:bg-google-hover enabled-active:bg-google-active on:bg-google-active",
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
// keyboard-focus ring (`:focus-visible`) and the always-on ring drawn by
// `showFocusRing` (`:focus`, e.g. an autofocused default action). Keeping
// the two states side by side stops them from drifting apart; the values are
// full literals so Tailwind keeps generating the classes.
const ringClassNames: Record<
  ButtonVariant,
  { focusVisible: string; focused: string }
> = {
  primary: {
    focusVisible: "focus-visible:ring-primary",
    focused: "focus:ring-primary",
  },
  secondary: {
    focusVisible: "focus-visible:ring-default",
    focused: "focus:ring-default",
  },
  ghost: {
    focusVisible: "focus-visible:ring-default",
    focused: "focus:ring-default",
  },
  danger: {
    focusVisible: "focus-visible:ring-danger",
    focused: "focus:ring-danger",
  },
  success: {
    focusVisible: "focus-visible:ring-success",
    focused: "focus:ring-success",
  },
  destructive: {
    focusVisible: "focus-visible:ring-danger",
    focused: "focus:ring-danger",
  },
  github: {
    focusVisible: "focus-visible:ring-default",
    focused: "focus:ring-default",
  },
  gitlab: {
    focusVisible: "focus-visible:ring-default",
    focused: "focus:ring-default",
  },
  origin: {
    focusVisible: "focus-visible:ring-default",
    focused: "focus:ring-default",
  },
  google: {
    focusVisible: "focus-visible:ring-default",
    focused: "focus:ring-default",
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
    variant !== "ghost" && "shadow-control on:shadow-control-flat",
    variantClassName,
    sizeClassName,
    ring.focusVisible,
    showFocusRing && ["focus:ring-4", ring.focused],
    "rounded-full",
    // ButtonGroup integration: drop the inner rounded ends so the segments butt
    // together, and where they meet each one's hairline draws the seam.
    //
    // Matched against the neighbouring controls rather than by position: a
    // segment that opens a popover has focus guards rendered beside it while
    // it is open, and those spans stop it being the group's last child — so a
    // `:last-child` rule squared the corner the moment the menu opened.
    "group-[*]/button-group:[:is(button,a)~&]:rounded-l-none",
    "group-[*]/button-group:[&:has(~:is(button,a))]:rounded-r-none",
    iconOnly && "justify-center",
    "focus:outline-hidden focus-visible:ring-4",
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
  extends ComponentPropsWithRef<"button">, ButtonOptions {
  /**
   * Holds the button in flight: it keeps its focus and its tooltip — hence
   * `aria-disabled` rather than `disabled` — swallows clicks, and shows a
   * spinner. react-aria's button had this built in; Base UI's does not.
   */
  pending?: boolean;
  /**
   * Run an asynchronous action when the button is pressed.
   * Automatically set the button in pending mode and
   * handles errors.
   *
   * Deliberately *not* named `onAction`: react-aria spells a menu item's
   * activation handler that way, and `onClick` is indistinguishable from it at
   * a call site — `onClick={async () => …}` on a Button still type-checks and
   * still runs, but silently loses the pending state, the error handling and
   * the toast.
   *
   * @example
   * <Button
   *   onAsyncAction={async () => {
   *     await resetLink();
   *   }}
   * >
   *  Reset link
   * </Button>
   */
  onAsyncAction?: () => Promise<void>;
}

export function Button({
  className,
  variant,
  size,
  iconOnly,
  showFocusRing,
  children,
  onAsyncAction,
  onClick,
  disabled,
  pending: pendingProp,
  type = "button",
  ...props
}: ButtonProps) {
  const buttonProps = getButtonProps({
    variant,
    size,
    iconOnly,
    showFocusRing,
  });
  const [isRunning, setIsRunning] = useState(false);
  const pending = pendingProp ?? isRunning;
  return (
    <BaseButton
      {...buttonProps}
      className={clsx(buttonProps.className, "cursor-default", className)}
      disabled={disabled}
      // Pending is not disabled: the button stays focusable, so it keeps its
      // place in the tab order and its tooltip stays reachable.
      aria-disabled={pending || undefined}
      type={type}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
        const promise = onAsyncAction?.();
        if (promise) {
          setIsRunning(true);
          promise
            .catch((error) => {
              toast.error(getErrorMessage(error));
            })
            .finally(() => {
              setIsRunning(false);
            });
        }
      }}
      {...props}
    >
      {pending ? (
        iconOnly ? (
          <Loader delay={0} />
        ) : (
          <>
            <ButtonIcon>
              <Loader delay={0} />
            </ButtonIcon>
            {children}
          </>
        )
      ) : (
        children
      )}
    </BaseButton>
  );
}

export interface LinkButtonProps
  extends ComponentPropsWithRef<"a">, ButtonOptions {
  /**
   * A link cannot really be disabled, so it says so and refuses the
   * navigation — which is what react-aria's `Link` did with the same prop.
   */
  disabled?: boolean;
}

/**
 * React applies `autoFocus` to `button`, `input`, `select` and `textarea` and
 * to nothing else, so an anchor asking for it is left unfocused without a
 * word — which is how a dialog whose default action is a link ended up with
 * nothing for Enter to trigger. Focus it from the ref instead, once, when it
 * mounts: that is what `autoFocus` means, and a re-render must not pull focus
 * back from wherever it has since moved.
 */
function useAutoFocusRef<T extends HTMLElement>(
  autoFocus: boolean | undefined,
) {
  const focusedRef = useRef(false);
  return useCallback(
    (element: T | null) => {
      if (!autoFocus || !element || focusedRef.current) {
        return;
      }
      focusedRef.current = true;
      element.focus();
    },
    [autoFocus],
  );
}

/**
 * A link wearing the button's clothes. `RouterLink` keeps an in-app path on
 * the client router and leaves a scheme like `codex://` a plain anchor —
 * which is what react-aria's `RouterProvider` used to do for every link.
 */
export function LinkButton({
  className,
  variant,
  size,
  iconOnly,
  showFocusRing,
  onClick,
  disabled,
  autoFocus,
  ref,
  ...props
}: LinkButtonProps) {
  const buttonProps = getButtonProps({
    variant,
    size,
    iconOnly,
    showFocusRing,
  });
  const autoFocusRef = useAutoFocusRef<HTMLAnchorElement>(autoFocus);
  return (
    <RouterLink
      {...buttonProps}
      ref={mergeRefs(ref, autoFocusRef)}
      className={clsx(buttonProps.className, className)}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
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
    "data-colored-icon": colorClassName ? true : undefined,
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
