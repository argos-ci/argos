import {
  cloneElement,
  ComponentPropsWithRef,
  createContext,
  isValidElement,
  use,
} from "react";
import { clsx } from "clsx";

import {
  lowTextColorClassNames,
  textColorClassNames,
  UIColor,
} from "@/util/colors";

import { RouterLink } from "./RouterLink";

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
    "hover:not-aria-[current=page]:bg-primary-hover",
    "hover:not-aria-[current=page]:text-primary",
    "aria-[current=page]:bg-primary-active",
    "aria-[current=page]:text-primary",
    "active:bg-primary-active",
    "active:text-primary",
  ),
  info: "hover:not-aria-[current=page]:bg-info-hover aria-[current=page]:bg-info-active active:bg-info-active",
  success:
    "hover:not-aria-[current=page]:bg-success-hover aria-[current=page]:bg-success-active active:bg-success-active",
  neutral:
    "hover:not-aria-[current=page]:bg-hover aria-[current=page]:bg-active aria-[current=page]:text-default active:bg-active",
  pending:
    "hover:not-aria-[current=page]:bg-pending-hover aria-[current=page]:bg-pending-active active:bg-pending-active",
  danger:
    "hover:not-aria-[current=page]:bg-danger-hover aria-[current=page]:bg-danger-active active:bg-danger-active",
  warning:
    "hover:not-aria-[current=page]:bg-warning-hover aria-[current=page]:bg-warning-active active:bg-warning-active",
  storybook:
    "hover:not-aria-[current=page]:bg-storybook-hover aria-[current=page]:bg-storybook-active active:bg-storybook-active",
  blank: clsx(
    "hover:not-aria-[current=page]:bg-hover active:bg-active",
    "group-[*]/button-group:not-aria-[current=page]:opacity-60",
    "group-[*]/button-group:hover:not-aria-[current=page]:opacity-100",
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
  // Spacing tokens of a scale. `--chip-gap` is the one horizontal unit a button
  // group is built from: icon to label, one segment to the next, and each end
  // of the group to its round cap. A lone chip is a pill and carries a pill's
  // padding; in a group the pill is the whole group, so every gap in it — the
  // outer two included — is the same.
  const spacingClassName: Record<ChipScale, string> = {
    xs: "[--chip-py:--spacing(0)] [--chip-gap:--spacing(1)]",
    sm: "[--chip-py:--spacing(1)] [--chip-gap:--spacing(1.5)]",
    md: "[--chip-py:--spacing(2)] [--chip-gap:--spacing(2)]",
  };
  const paddingXClassName: Record<ChipScale, string> = {
    xs: "px-2.5",
    sm: "px-2.5",
    md: "px-4.5",
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
    interactive && "focus-ring",
    textSizeClassName[scale],
    spacingClassName[scale],
    "py-(--chip-py)",
    // An icon-only chip mirrors its vertical padding horizontally, so it ends
    // up square — a circle the same height as a text chip of the same scale.
    // The padding sits on the chip rather than on the icon so that a button
    // group can override it.
    isEmpty
      ? "px-[calc(var(--chip-py)+(1lh-1em)/2)]"
      : paddingXClassName[scale],
    "group-[*]/button-group:px-(--chip-gap)",
    "group-[*]/button-group:rounded-none",
    "group-[*]/button-group:first:rounded-l-chip group-[*]/button-group:not-first:border-l-0",
    "group-[*]/button-group:last:rounded-r-chip",
    isEmpty ? "rounded-full" : "rounded-chip",
    "gap-(--chip-gap) inline-flex min-w-0 max-w-full select-none items-center border-thin font-medium leading-4",
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
            // with the text.
            const iconClassName = "size-[1em] my-[calc((1lh-1em)/2)] shrink-0";
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

export type ChipLinkProps = Omit<ComponentPropsWithRef<"a">, "color"> &
  ChipOptions;

export function ChipLink(rawProps: ChipLinkProps) {
  const props = useChipContextProps(rawProps);
  const { chipProps } = useChip({ ...props, elementType: "a" });
  return <RouterLink {...chipProps} />;
}

type ChipButtonProps = Omit<ComponentPropsWithRef<"button">, "color"> &
  ChipOptions;

export function ChipButton({ type = "button", ...rawProps }: ChipButtonProps) {
  const props = useChipContextProps(rawProps);
  const { chipProps } = useChip({ ...props, elementType: "button" });
  return <button type={type} {...chipProps} />;
}
