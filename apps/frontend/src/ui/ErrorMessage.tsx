import { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

export function ErrorMessage({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      role="alert"
      className={clsx("text-danger-low inline-block text-sm", className)}
      {...props}
    />
  );
}
