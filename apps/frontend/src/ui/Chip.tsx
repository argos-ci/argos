import { cloneElement, ComponentProps, isValidElement } from "react";
import { clsx } from "clsx";
import {
  Button,
  ButtonProps,
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
  /**
   * When true, renders children directly (for segmented chips).
   */
  segmented?: boolean;
};

const interactiveClassNames = {
  primary: clsx(
    "data-[hovered]:not-aria-[current=page]:bg-primary-hover",
    "data-[hovered]:not-aria-[current=page]:text-primary",
    "aria-[current=page]:bg-primary-active",
    "aria-[current=page]:text-primary",
    "data-pressed:bg-primary-active",
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
  segmented?: boolean;
}) {
  const { color, scale, elementType, segmented } = props;
  const interactive = elementType === "button" || elementType === "a";
  const textSizeClassName: Record<ChipScale, string> = {
    xs: "text-xs",
    sm: "text-xs",
    md: "text-sm",
  };
  const spacingClassName: Record<ChipScale, string> = {
    xs: "px-2 [--chip-gap:--spacing(1)]",
    sm: "px-3 py-1 [--chip-gap:--spacing(1.5)]",
    md: "px-4 py-2 [--chip-gap:--spacing(2)]",
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
    interactive &&
      clsx(
        "rac-focus",
        "group-[*]/button-group:rounded-none",
        "group-[*]/button-group:first:rounded-l-lg group-[*]/button-group:not-first:border-l-0",
        "group-[*]/button-group:last:rounded-r-lg",
      ),
    textSizeClassName[scale],
    !segmented && spacingClassName[scale],
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
    segmented,
    ...rest
  } = options;
  return {
    chipProps: {
      className: clsx(
        getChipClassName({ color, scale, elementType, segmented }),
        className,
      ),
      children: segmented ? (
        children
      ) : (
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

const chipSegmentBaseClassName =
  "group/chip-segment flex items-center border-r border-inherit text-inherit last:border-r-0 select-none -ml-px first:ml-0 gap-1 px-1 first:pl-1.5 last:rounded-r-chip";

export const ChipSegment = ({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) => {
  return (
    <div className={clsx(chipSegmentBaseClassName, className)} {...props} />
  );
};

export const ChipSegmentButton = ({
  className,
  color = "primary",
  ...props
}: ButtonProps & { color?: ChipColor }) => {
  return (
    <Button
      className={clsx(
        chipSegmentBaseClassName,
        interactiveClassNames[color],
        "h-4 truncate",
        className,
      )}
      {...props}
    />
  );
};
