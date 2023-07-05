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
          "rounded-lg border px-[7px] py-[3px] text-xxs font-semibold tabular-nums leading-none text-on-light"
        )}
      >
        {children}
      </div>
    );
  }
);
