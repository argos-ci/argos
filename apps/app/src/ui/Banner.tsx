import { clsx } from "clsx";
import { HTMLProps, forwardRef } from "react";

export interface BannerProps extends HTMLProps<HTMLDivElement> {
  color: "neutral" | "danger" | "warning";
}

const colorClassNames = {
  neutral:
    "bg-gradient-to-r from-neutral-800 via-primary-900/80 to-neutral-800",
  danger:
    "bg-gradient-to-r from-neutral-800 via-red-900 to-neutral-800 text-red-200",
  warning:
    "bg-gradient-to-r from-neutral-800 via-warning-900 to-neutral-800 text-warning-200",
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
          "min-h-[40px] p-2 text-sm font-medium"
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
