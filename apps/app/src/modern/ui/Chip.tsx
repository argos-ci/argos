import { clsx } from "clsx";
import { forwardRef } from "react";

type ChipColor =
  | "primary"
  | "info"
  | "success"
  | "neutral"
  | "pending"
  | "danger"
  | "warning";

export interface ChipProps
  extends Omit<React.ComponentProps<"div">, "className"> {
  color?: ChipColor;
  icon?: React.ComponentType<any>;
}

const colorClassNames: Record<ChipColor, string> = {
  primary: "text-primary-300 bg-primary-900/50",
  info: "text-info-300 bg-info-900/50",
  success: "text-success-300 bg-success-900/50",
  neutral: "text-neutral-300 bg-neutral-900/50",
  pending: "text-pending-300 bg-pending-900/50",
  danger: "text-danger-300 bg-danger-900/50",
  warning: "text-warning-300 bg-warning-900/50",
};

export const Chip = forwardRef<HTMLDivElement, ChipProps>(
  ({ children, icon: Icon, color = "primary", ...props }, ref) => {
    const colorClassName = colorClassNames[color];
    if (!colorClassName) {
      throw new Error(`Invalid color: ${color}`);
    }
    return (
      <div
        ref={ref}
        className={clsx(
          colorClassName,
          "no-wrap inline-flex select-none items-center gap-2 rounded-chip px-4 py-2 text-sm font-medium leading-4"
        )}
        {...props}
      >
        {Icon && <Icon className="h-[1em] w-[1em] shrink-0" />}
        {children}
      </div>
    );
  }
);
