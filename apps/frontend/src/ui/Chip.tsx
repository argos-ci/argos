import {
  cloneElement,
  ComponentProps,
  createContext,
  isValidElement,
  use,
} from "react";
import { clsx } from "clsx";
import {
  Button as RACButton,
  ButtonProps as RACButtonProps,
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";

import {
  lowTextColorClassNames,
  textColorClassNames,
  UIColor,
} from "@/util/colors";

export type ChipColor = UIColor | "blank";

type ChipScale = "xs" | "sm" | "md";
type ChipElementType = "div" | "button" | "a";

type ChipOptions = {
  /**
   * Color of the chip.
   */
  color?: ChipColor;
  /**
   * Icon to display on the left of the chip.
   */
  icon?:
    | React.ReactElement<{ className?: string }>
    | React.ComponentType<{ className?: string }>
    | null;
  /**
   * Scale of the chip.
   */
  scale?: ChipScale | undefined;
};

/**
 * Provides default props for any Chip / ChipLink / ChipButton in the subtree.
 * Explicit props on each chip override the context defaults.
 *
 * Inspired by react-aria's `useContextProps` pattern
 * (https://react-aria.adobe.com/customization), but simplified since we only
 * need to merge style defaults — not refs across multiple element types.
 *
 * @example
 * <ChipContext value={{ color: "blank", scale: "sm" }}>
 *   <Chip>...</Chip> // gets color="blank" scale="sm"
 *   <Chip color="primary">...</Chip> // gets color="primary" scale="sm"
 * </ChipContext>
 */
export const ChipContext = createContext<Partial<ChipOptions>>({});

function useChipContextProps<T extends Partial<ChipOptions>>(props: T): T {
  const defaults = use(ChipContext);
  return { ...defaults, ...props };
}

const interactiveClassNames: Record<ChipColor, string> = {
  primary: clsx(
    "data-hovered:not-aria-[current=page]:bg-primary-hover",
    "data-hovered:not-aria-[current=page]:text-primary",
    "aria-[current=page]:bg-primary-active",
    "aria-[current=page]:text-primary",
    "data-pressed:bg-primary-active",
    "data-pressed:text-primary",
  ),
  info: "data-hovered:not-aria-[current=page]:bg-info-hover aria-[current=page]:bg-info-active data-pressed:bg-info-active",
  success:
    "data-hovered:not-aria-[current=page]:bg-success-hover aria-[current=page]:bg-success-active data-pressed:bg-success-active",
  neutral:
    "data-hovered:not-aria-[current=page]:bg-hover aria-[current=page]:bg-active aria-[current=page]:text-default data-pressed:bg-active",
  pending:
    "data-hovered:not-aria-[current=page]:bg-pending-hover aria-[current=page]:bg-pending-active data-pressed:bg-pending-active",
  danger:
    "data-hovered:not-aria-[current=page]:bg-danger-hover aria-[current=page]:bg-danger-active data-pressed:bg-danger-active",
  warning:
    "data-hovered:not-aria-[current=page]:bg-warning-hover aria-[current=page]:bg-warning-active data-pressed:bg-warning-active",
  storybook:
    "data-hovered:not-aria-[current=page]:bg-storybook-hover aria-[current=page]:bg-storybook-active data-pressed:bg-storybook-active",
  blank: clsx(
    "data-hovered:not-aria-[current=page]:bg-hover data-pressed:bg-active",
    "group-[*]/button-group:not-aria-[current=page]:opacity-60",
    "group-[*]/button-group:data-hovered:not-aria-[current=page]:opacity-100",
    "group-[*]/button-group:border-default",
  ),
};

/**
 * Compute the class name for a chip.
 */
function getChipClassName(props: {
  color: ChipColor;
  scale: ChipScale;
  elementType: ChipElementType;
  isEmpty: boolean;
}) {
  const { color, scale, elementType, isEmpty } = props;
  const interactive = elementType === "button" || elementType === "a";
  const textSizeClassName: Record<ChipScale, string> = {
    xs: "text-xs",
    sm: "text-xs",
    md: "text-sm",
  };
  // For an icon-only chip we mirror the non-empty vertical padding on every
  // side so it ends up square (a circle) and the same height as a text chip of
  // the same scale. When a trailing avatar sits flush at the end, we shrink the
  // right padding down to the vertical padding so the round avatar has equal
  // top/right spacing instead of looking lost in a wide right gap.
  const spacingClassName: Record<ChipScale, string> = {
    xs: clsx(
      isEmpty ? "p-0.5" : "px-2 py-0.5 has-data-chip-end-avatar:pr-0.5",
      "[--chip-gap:--spacing(1)]",
    ),
    sm: clsx(
      isEmpty ? "p-1" : "px-2.5 py-1 has-data-chip-end-avatar:pr-1",
      "[--chip-gap:--spacing(1.5)]",
    ),
    md: clsx(
      isEmpty ? "p-2.5" : "px-4 py-2.5 has-data-chip-end-avatar:pr-2.5",
      "[--chip-gap:--spacing(2)]",
    ),
  };
  const colorClassNames: Record<ChipColor, string> = {
    primary: clsx(
      lowTextColorClassNames.primary,
      "border-primary bg-primary-app",
    ),
    info: clsx(lowTextColorClassNames.info, "border-info bg-info-app"),
    success: clsx(
      lowTextColorClassNames.success,
      "border-success bg-success-app",
    ),
    neutral: clsx(lowTextColorClassNames.neutral, "border-default bg-app"),
    pending: clsx(
      lowTextColorClassNames.pending,
      "border-pending bg-pending-app",
    ),
    danger: clsx(lowTextColorClassNames.danger, "border-danger bg-danger-app"),
    warning: clsx(
      lowTextColorClassNames.warning,
      "border-warning bg-warning-app",
    ),
    storybook: clsx(
      lowTextColorClassNames.storybook,
      "border-storybook bg-storybook-app",
    ),
    blank: clsx(textColorClassNames.neutral, "border-transparent bg-app"),
  };
  return clsx(
    colorClassNames[color],
    interactive && interactiveClassNames[color],
    interactive && "rac-focus",
    textSizeClassName[scale],
    spacingClassName[scale],
    "group-[*]/button-group:not-first:pl-(--chip-gap) group-[*]/button-group:not-last:pr-(--chip-gap)",
    "group-[*]/button-group:rounded-none",
    "group-[*]/button-group:first:rounded-l-chip group-[*]/button-group:not-first:border-l-0",
    "group-[*]/button-group:last:rounded-r-chip",
    isEmpty ? "rounded-full" : "rounded-chip",
    "gap-(--chip-gap) inline-flex min-w-0 select-none items-center border-thin font-medium leading-4",
  );
}

/**
 * Hook to get the props for a chip.
 */
function useChip<
  T extends ChipOptions & {
    elementType: ChipElementType;
    className?: string;
    children?: React.ReactNode;
  },
>(options: T) {
  const {
    color = "primary",
    scale = "md",
    className,
    icon,
    children,
    elementType,
    ...rest
  } = options;
  const isEmpty = children == null;
  return {
    chipProps: {
      className: clsx(
        getChipClassName({ color, scale, elementType, isEmpty }),
        className,
      ),
      children: (
        <>
          {(() => {
            // The margin pads the 1em icon out to a full line box so it aligns
            // with the text. With no text, applying it on every side keeps that
            // box square, so the chip is a circle the same height as a text
            // chip of the same scale.
            const iconClassName = clsx(
              "size-[1em] shrink-0",
              isEmpty ? "m-[calc((1lh-1em)/2)]" : "my-[calc((1lh-1em)/2)]",
            );
            if (isValidElement(icon)) {
              return cloneElement(icon, {
                className: clsx(icon.props.className, iconClassName),
              });
            }
            if (icon) {
              const Icon = icon;
              return <Icon className={iconClassName} />;
            }
            return null;
          })()}
          <span className="flex-1 truncate empty:hidden">{children}</span>
        </>
      ),
      ...rest,
    },
  };
}

export type ChipProps = Omit<React.ComponentPropsWithRef<"div">, "color"> &
  ChipOptions;

export function Chip(rawProps: ChipProps) {
  const props = useChipContextProps(rawProps);
  const { chipProps } = useChip({ ...props, elementType: "div" });
  return <div {...chipProps} />;
}

export type ChipLinkProps = Omit<
  RACLinkProps,
  "color" | "className" | "children"
> &
  Pick<ComponentProps<"a">, "className" | "children"> &
  ChipOptions;

export function ChipLink(rawProps: ChipLinkProps) {
  const props = useChipContextProps(rawProps);
  const { chipProps } = useChip({ ...props, elementType: "a" });
  return <RACLink {...chipProps} />;
}

type ChipButtonProps = Omit<
  RACButtonProps,
  "color" | "className" | "children"
> &
  Pick<ComponentProps<"button">, "className" | "children"> &
  ChipOptions;

export function ChipButton(rawProps: ChipButtonProps) {
  const props = useChipContextProps(rawProps);
  const { chipProps } = useChip({ ...props, elementType: "button" });
  return <RACButton {...chipProps} />;
}
