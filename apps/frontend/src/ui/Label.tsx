import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

type LabelProps = ComponentPropsWithRef<"label"> & {
  invalid?: boolean;
};

export function Label(props: LabelProps) {
  const { invalid, ...rest } = props;
  return (
    <label
      {...rest}
      className={clsx(
        "mb-2 inline-block text-sm font-medium",
        invalid && "text-danger-low",
        rest.className,
      )}
    />
  );
}
