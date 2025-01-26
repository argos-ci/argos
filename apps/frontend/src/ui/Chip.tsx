import { clsx } from "clsx";

import { lowTextColorClassNames, UIColor } from "@/util/colors";

export type ChipColor = UIColor;

export type ChipProps = Omit<React.ComponentPropsWithRef<"div">, "color"> & {
  color?: ChipColor;
  icon?: React.ComponentType<any> | null;
  scale?: "xs" | "sm" | "md" | undefined;
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

export function Chip({
  children,
  icon: Icon,
  color = "primary",
  scale = "md",
  className,
  ...rest
}: ChipProps) {
  const colorClassName = colorClassNames[color];
  return (
    <div
      className={clsx(
        colorClassName,
        scale === "xs" && "px-2 text-xs [--chip-gap:--spacing(1)]",
        scale === "sm" && "px-3 py-1 text-xs [--chip-gap:--spacing(1)]",
        scale === "md" && "px-4 py-2 text-sm [--chip-gap:--spacing(2)]",
        "rounded-chip gap-(--chip-gap) inline-flex min-w-0 select-none items-center border font-medium leading-4",
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="size-[1em] shrink-0" />}
      <span className="flex-1 truncate">{children}</span>
    </div>
  );
}
