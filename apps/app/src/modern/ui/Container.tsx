import { clsx } from "clsx";
import { HTMLAttributes } from "react";

export const Container = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={clsx(className, "container mx-auto px-4")} {...props} />
  );
};
