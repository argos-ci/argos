import { forwardRef } from "react";
import { clsx } from "clsx";

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
          "text-xxs text-low rounded-md border px-2 py-0.5 font-semibold tabular-nums leading-none",
        )}
      >
        {children}
      </div>
    );
  },
);
