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

export interface ChipProps
  extends Omit<React.ComponentProps<"div">, "className"> {
  color?: ChipColor;
  icon?: React.ComponentType<any> | null;
  scale?: "xs" | "sm" | "md" | undefined;
}

const colorClassNames: Record<ChipColor, string> = {
  primary: "text-primary-300 border-primary-900",
  info: "text-info-300 border-info-900",
  success: "text-success-300 border-success-900",
  neutral: "text-neutral-300 border-neutral-600",
  pending: "text-pending-300 border-pending-900",
  danger: "text-danger-300 border-danger-900",
  warning: "text-warning-300 border-warning-900",
};

export const Chip = forwardRef<HTMLDivElement, ChipProps>(
  (
    { children, icon: Icon, color = "primary", scale = "md", ...props },
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
          "no-wrap inline-flex select-none items-center gap-2 whitespace-nowrap rounded-chip border font-medium leading-4"
        )}
        {...props}
      >
        {Icon && <Icon className="h-[1em] w-[1em] shrink-0" />}
        {children}
      </div>
    );
  }
);
