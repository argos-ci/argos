import { clsx } from "clsx";
import { HTMLProps } from "react";

export const Container = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div className={clsx(className, "container mx-auto px-4")} {...props} />
  );
};
