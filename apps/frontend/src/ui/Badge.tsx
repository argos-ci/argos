import { clsx } from "clsx";
import { forwardRef } from "react";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ children, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          className,
          "rounded-md border px-2 py-0.5 text-xxs font-semibold tabular-nums leading-none text-low",
        )}
      >
        {children}
      </div>
    );
  },
);
