import { clsx } from "clsx";
import { forwardRef } from "react";

export type ChipColor =
  | "primary"
  | "info"
  | "success"
  | "neutral"
  | "pending"
  | "danger"
  | "warning";

export interface ChipProps extends React.ComponentProps<"div"> {
  color?: ChipColor;
  icon?: React.ComponentType<any> | null;
  scale?: "xs" | "sm" | "md" | undefined;
}

const colorClassNames: Record<ChipColor, string> = {
  primary: "text-primary-low border-primary bg-primary-app",
  info: "text-info-low border-info bg-info-app",
  success: "text-success-low border-success bg-success-app",
  neutral: "text-low border bg-app",
  pending: "text-pending-low border-pending bg-pending-app",
  danger: "text-danger-low border-danger bg-danger-app",
  warning: "text-warning-low border-warning bg-warning-app",
};

export const Chip = forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      children,
      icon: Icon,
      color = "primary",
      scale = "md",
      className,
      ...props
    },
    ref
  ) => {
    const colorClassName = colorClassNames[color];
    if (!colorClassName) {
      throw new Error(`Invalid color: ${color}`);
    }
    return (
      <div
        ref={ref}
        className={clsx(
          colorClassName,
          scale === "xs" && "px-2 text-xs",
          scale === "sm" && "px-3 py-1 text-xs",
          scale === "md" && "px-4 py-2 text-sm",
          "no-wrap inline-flex select-none items-center gap-2 whitespace-nowrap rounded-chip border font-medium leading-4",
          className
        )}
        {...props}
      >
        {Icon && <Icon className="h-[1em] w-[1em] shrink-0" />}
        {children}
      </div>
    );
  }
);
