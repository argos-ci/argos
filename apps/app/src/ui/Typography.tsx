import { clsx } from "clsx";
import { HTMLProps } from "react";

export const Heading = ({
  className,
  ...props
}: HTMLProps<HTMLHeadingElement>) => {
  return (
    <h1 className={clsx(className, "mb-4 text-2xl font-medium")} {...props} />
  );
};

export const Headline = ({
  className,
  ...props
}: HTMLProps<HTMLParagraphElement>) => {
  return <p className={clsx(className, "text-sm text-on-light")} {...props} />;
};
