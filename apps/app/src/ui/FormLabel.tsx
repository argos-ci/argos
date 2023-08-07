import { clsx } from "clsx";
import { HTMLProps } from "react";

export type FormLabelProps = {
  invalid?: boolean;
} & HTMLProps<HTMLLabelElement>;

export const FormLabel = ({ className, invalid, ...props }: FormLabelProps) => {
  return (
    <label
      className={clsx(
        className,
        "mb-2 inline-block text-sm font-medium",
        invalid ? "text-danger-low" : "text-low",
      )}
      {...props}
    />
  );
};
