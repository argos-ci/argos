import { clsx } from "clsx";

export type ChipColor =
  | "primary"
  | "info"
  | "success"
  | "neutral"
  | "pending"
  | "danger"
  | "warning";

export type ChipProps = Omit<React.ComponentPropsWithRef<"div">, "color"> & {
  color?: ChipColor;
  icon?: React.ComponentType<any> | null;
  scale?: "xs" | "sm" | "md" | undefined;
};

const colorClassNames: Record<ChipColor, string> = {
  primary: "text-primary-low border-primary bg-primary-app",
  info: "text-info-low border-info bg-info-app",
  success: "text-success-low border-success bg-success-app",
  neutral: "text-low border bg-app",
  pending: "text-pending-low border-pending bg-pending-app",
  danger: "text-danger-low border-danger bg-danger-app",
  warning: "text-warning-low border-warning bg-warning-app",
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
        scale === "xs" && "gap-1 px-2 text-xs",
        scale === "sm" && "gap-1 px-3 py-1 text-xs",
        scale === "md" && "gap-2 px-4 py-2 text-sm",
        "rounded-chip inline-flex min-w-0 select-none items-center border font-medium leading-4",
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="size-[1em] shrink-0" />}
      <span className="flex-1 truncate">{children}</span>
    </div>
  );
}
