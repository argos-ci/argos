import { clsx } from "clsx";
import { HTMLProps } from "react";

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
  return <p className={clsx(className, "my-2 text-sm text-low")} {...props} />;
};

export const AlertActions = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return <div className={clsx(className, "mt-4")} {...props} />;
};
