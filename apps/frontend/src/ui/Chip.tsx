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

/**
 * Compute the class name for a chip.
 */
function getChipClassName(props: {
  color: ChipColor;
  scale: ChipScale;
  elementType: ChipElementType;
}) {
  const { color, scale, elementType } = props;
  const interactive = elementType === "button" || elementType === "a";
  const colorClassNames: Record<ChipColor, string> = {
    primary: clsx(
      lowTextColorClassNames.primary,
      "border-primary bg-primary-app",
      interactive &&
        clsx(
          "data-[hovered]:not-aria-[current=page]:bg-primary-hover",
          "data-[hovered]:not-aria-[current=page]:text-primary",
          "aria-[current=page]:bg-primary-active",
          "aria-[current=page]:text-primary",
        ),
    ),
    info: clsx(
      lowTextColorClassNames.info,
      "border-info bg-info-app",
      interactive &&
        "data-[hovered]:not-aria-[current=page]:bg-info-hover aria-[current=page]:bg-info-active",
    ),
    success: clsx(
      lowTextColorClassNames.success,
      "border-success bg-success-app",
      interactive &&
        "data-[hovered]:not-aria-[current=page]:bg-success-hover aria-[current=page]:bg-success-active",
    ),
    neutral: clsx(
      lowTextColorClassNames.neutral,
      "border bg-app",
      interactive &&
        "data-[hovered]:not-aria-[current=page]:bg-hover aria-[current=page]:bg-active",
    ),
    pending: clsx(
      lowTextColorClassNames.pending,
      "border-pending bg-pending-app",
      interactive &&
        "data-[hovered]:not-aria-[current=page]:bg-pending-hover aria-[current=page]:bg-pending-active",
    ),
    danger: clsx(
      lowTextColorClassNames.danger,
      "border-danger bg-danger-app",
      interactive &&
        "data-[hovered]:not-aria-[current=page]:bg-danger-hover aria-[current=page]:bg-danger-active",
    ),
    warning: clsx(
      lowTextColorClassNames.warning,
      "border-warning bg-warning-app",
      interactive &&
        "data-[hovered]:not-aria-[current=page]:bg-warning-hover aria-[current=page]:bg-warning-active",
    ),
  };
  return clsx(
    colorClassNames[color],
    interactive &&
      clsx(
        "rac-focus",
        "group-[*]/button-group:rounded-none",
        "group-[*]/button-group:first:rounded-l-lg group-[*]/button-group:first:border-r-0",
        "group-[*]/button-group:last:rounded-r-lg group-[*]/button-group:last:border-l-0",
      ),
    scale === "xs" && "px-2 text-xs [--chip-gap:--spacing(1)]",
    scale === "sm" && "px-3 py-1 text-xs [--chip-gap:--spacing(1)]",
    scale === "md" && "px-4 py-2 text-sm [--chip-gap:--spacing(2)]",
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
        getChipClassName({ color, scale, elementType }),
        className,
      ),
      children: (
        <>
          {(() => {
            const iconClassName = "size-[1em] shrink-0";
            if (isValidElement(icon)) {
              return cloneElement(icon, { className: iconClassName });
            }
            if (icon) {
              const Icon = icon;
              return <Icon className={iconClassName} />;
            }
            return null;
          })()}
          <span className="flex-1 truncate">{children}</span>
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

export type ChipButtonProps = Omit<
  RACButtonProps,
  "color" | "className" | "children"
> &
  Pick<ComponentProps<"button">, "className" | "children"> &
  ChipOptions;

export function ChipButton(props: ChipButtonProps) {
  const { chipProps } = useChip({ ...props, elementType: "button" });
  return <RACButton {...chipProps} />;
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
