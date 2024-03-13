import { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

export const FormError = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) => {
  return (
    <div
      role="alert"
      className={clsx(className, "text-danger-low inline-block text-sm")}
      {...props}
    />
  );
};
