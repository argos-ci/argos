import { clsx } from "clsx";
import { HTMLAttributes } from "react";

export const Alert = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div role="alert" className={clsx(className, "text-center")} {...props} />
  );
};

export const AlertTitle = ({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h2 className={clsx(className, "mb-3 text-xl font-medium")} {...props} />
  );
};

export const AlertText = ({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <p className={clsx(className, "my-2 text-sm text-on-light")} {...props} />
  );
};

export const AlertActions = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return <div className={clsx(className, "mt-4")} {...props} />;
};
