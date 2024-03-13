import { HTMLProps } from "react";
import { clsx } from "clsx";

export const Alert = ({ className, ...props }: HTMLProps<HTMLDivElement>) => {
  return (
    <div role="alert" className={clsx("text-center", className)} {...props} />
  );
};

export const AlertTitle = ({
  className,
  ...props
}: HTMLProps<HTMLHeadingElement>) => {
  return (
    <h2 className={clsx(className, "mb-3 text-xl font-medium")} {...props} />
  );
};

export const AlertText = ({
  className,
  ...props
}: HTMLProps<HTMLHeadingElement>) => {
  return <p className={clsx(className, "text-low my-2 text-sm")} {...props} />;
};

export const AlertActions = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return <div className={clsx(className, "mt-4")} {...props} />;
};
