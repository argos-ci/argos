import { clsx } from "clsx";
import { ComponentPropsWithoutRef } from "react";

export const FormError = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) => {
  return (
    <div
      role="alert"
      className={clsx(className, "inline-block text-sm text-danger-low")}
      {...props}
    />
  );
};
