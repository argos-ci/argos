import { clsx } from "clsx";
import { HTMLProps, forwardRef } from "react";

export interface BannerProps extends HTMLProps<HTMLDivElement> {
  color: "neutral" | "danger" | "warning";
}

const colorClassNames = {
  neutral: "bg-neutral-500/20 text-neutral-400",
  danger: "bg-danger-500/20 text-danger-400",
  warning: "bg-warning-500/20 text-warning-400",
};

export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  ({ children, color = "neutral", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={clsx(
          className,
          colorClassNames[color],
          "border-b border-b-border p-4 text-base font-medium"
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
