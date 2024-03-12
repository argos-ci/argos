import { HTMLProps } from "react";
import { clsx } from "clsx";

export const Container = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div className={clsx(className, "container mx-auto px-4")} {...props} />
  );
};
