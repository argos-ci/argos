import { clsx } from "clsx";
import { HTMLProps } from "react";

export const FormLabel = ({
  className,
  invalid,
  ...props
}: {
  invalid?: boolean;
} & HTMLProps<HTMLLabelElement>) => {
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
