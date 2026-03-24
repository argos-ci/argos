import { cloneElement, ComponentProps, isValidElement } from "react";
import { clsx } from "clsx";
import {
  Button as RACButton,
  ButtonProps as RACButtonProps,
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";

import { lowTextColorClassNames, UIColor } from "@/util/colors";

export type ChipColor = UIColor;

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

const interactiveClassNames = {
  primary: clsx(
    "data-hovered:not-aria-[current=page]:bg-primary-hover",
    "data-hovered:not-aria-[current=page]:text-primary",
    "aria-[current=page]:bg-primary-active",
    "aria-[current=page]:text-primary",
    "data-pressed:bg-primary-active",
    "data-pressed:text-primary",
  ),
  info: "data-[hovered]:not-aria-[current=page]:bg-info-hover aria-[current=page]:bg-info-active data-pressed:bg-info-active",
  success:
    "data-[hovered]:not-aria-[current=page]:bg-success-hover aria-[current=page]:bg-success-active data-pressed:bg-success-active",
  neutral:
    "data-[hovered]:not-aria-[current=page]:bg-hover aria-[current=page]:bg-active data-pressed:bg-active",
  pending:
    "data-[hovered]:not-aria-[current=page]:bg-pending-hover aria-[current=page]:bg-pending-active data-pressed:bg-pending-active",
  danger:
    "data-[hovered]:not-aria-[current=page]:bg-danger-hover aria-[current=page]:bg-danger-active data-pressed:bg-danger-active",
  warning:
    "data-[hovered]:not-aria-[current=page]:bg-warning-hover aria-[current=page]:bg-warning-active data-pressed:bg-warning-active",
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
  const spacingClassName: Record<ChipScale, string> = {
    xs: clsx(
      isEmpty ? "px-1" : "px-2",
      "[--chip-gap:--spacing(1)] group-[*]/button-group:not-first:not-last:px-1",
    ),
    sm: clsx(
      isEmpty ? "px-1" : "px-3",
      "px-3 py-1 [--chip-gap:--spacing(1.5)] group-[*]/button-group:not-first:not-last:px-2",
    ),
    md: clsx(
      isEmpty ? "px-2" : "px-4",
      "px-4 py-2 [--chip-gap:--spacing(2)] group-[*]/button-group:not-first:not-last:px-3",
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
    neutral: clsx(lowTextColorClassNames.neutral, "border bg-app"),
    pending: clsx(
      lowTextColorClassNames.pending,
      "border-pending bg-pending-app",
    ),
    danger: clsx(lowTextColorClassNames.danger, "border-danger bg-danger-app"),
    warning: clsx(
      lowTextColorClassNames.warning,
      "border-warning bg-warning-app",
    ),
  };
  return clsx(
    colorClassNames[color],
    interactive && interactiveClassNames[color],
    interactive && "rac-focus",
    textSizeClassName[scale],
    spacingClassName[scale],
    "group-[*]/button-group:rounded-none",
    "group-[*]/button-group:first:rounded-l-lg group-[*]/button-group:not-first:border-l-0",
    "group-[*]/button-group:last:rounded-r-lg",
    "rounded-chip gap-(--chip-gap) inline-flex min-w-0 select-none items-center border font-medium leading-4",
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
  return {
    chipProps: {
      className: clsx(
        getChipClassName({
          color,
          scale,
          elementType,
          isEmpty: children == null,
        }),
        className,
      ),
      children: (
        <>
          {(() => {
            const iconClassName = "size-[1em] my-[calc((1lh-1em)/2)] shrink-0";
            if (isValidElement(icon)) {
              return cloneElement(icon, { className: iconClassName });
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

export function Chip(props: ChipProps) {
  const { chipProps } = useChip({ ...props, elementType: "div" });
  return <div {...chipProps} />;
}

export type ChipLinkProps = Omit<
  RACLinkProps,
  "color" | "className" | "children"
> &
  Pick<ComponentProps<"a">, "className" | "children"> &
  ChipOptions;

export function ChipLink(props: ChipLinkProps) {
  const { chipProps } = useChip({ ...props, elementType: "a" });
  return <RACLink {...chipProps} />;
}

type ChipButtonProps = Omit<
  RACButtonProps,
  "color" | "className" | "children"
> &
  Pick<ComponentProps<"button">, "className" | "children"> &
  ChipOptions;

export function ChipButton(props: ChipButtonProps) {
  const { chipProps } = useChip({ ...props, elementType: "button" });
  return <RACButton {...chipProps} />;
}
