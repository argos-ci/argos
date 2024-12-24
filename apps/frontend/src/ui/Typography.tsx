import { HTMLProps } from "react";
import { clsx } from "clsx";

export const Heading = ({
  className,
  margin,
  ...props
}: HTMLProps<HTMLHeadingElement> & { margin?: boolean }) => {
  return (
    <h1
      className={clsx(
        className,
        "text-2xl font-medium",
        margin !== false && "mb-4",
      )}
      {...props}
    />
  );
};

export const Headline = ({
  className,
  ...props
}: HTMLProps<HTMLParagraphElement>) => {
  return <p className={clsx(className, "text-low text-sm")} {...props} />;
};
