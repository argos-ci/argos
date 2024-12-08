import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export type BannerProps = Omit<ComponentPropsWithRef<"div">, "color"> & {
  color: "neutral" | "danger" | "warning";
};

const colorClassNames = {
  neutral: "bg-ui text",
  danger: "bg-danger-ui text-danger-low",
  warning: "bg-warning-ui text-warning-low",
};

export function Banner({
  ref,
  children,
  color = "neutral",
  className,
  ...props
}: BannerProps) {
  return (
    <div
      ref={ref}
      role="alert"
      className={clsx(
        className,
        colorClassNames[color],
        "p-2 text-sm font-medium",
      )}
      {...props}
    >
      {children}
    </div>
  );
}
