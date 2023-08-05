import { clsx } from "clsx";
import { HTMLProps, forwardRef } from "react";

export interface BannerProps extends HTMLProps<HTMLDivElement> {
  color: "neutral" | "danger" | "warning";
}

const colorClassNames = {
  neutral: "bg-ui text",
  danger: "bg-danger-ui text-danger-low",
  warning: "bg-warning-ui text-warning-low",
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
