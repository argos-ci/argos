import { forwardRef } from "react";
import { clsx } from "clsx";
import {
  Label as RACLabel,
  LabelProps as RACLabelProps,
} from "react-aria-components";

export type LabelProps = RACLabelProps & {
  invalid?: boolean;
};

export const Label = forwardRef(function Label(
  props: LabelProps,
  ref: React.ForwardedRef<HTMLLabelElement>,
) {
  const { invalid, ...rest } = props;
  return (
    <RACLabel
      ref={ref}
      {...rest}
      className={clsx(
        "mb-2 inline-block text-sm font-medium",
        invalid ? "text-danger-low" : "text-low",
        props.className,
      )}
    />
  );
});
