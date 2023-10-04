import { clsx } from "clsx";
import { HTMLProps } from "react";

export type FormErrorProps = HTMLProps<HTMLDivElement>;

export const FormError = ({ className, ...props }: FormErrorProps) => {
  return (
    <div
      role="alert"
      className={clsx(className, "inline-block text-sm text-danger-low")}
      {...props}
    />
  );
};
