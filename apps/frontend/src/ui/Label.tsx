import { clsx } from "clsx";
import {
  Label as RACLabel,
  LabelProps as RACLabelProps,
} from "react-aria-components";

type LabelProps = RACLabelProps & {
  ref?: React.ForwardedRef<HTMLLabelElement>;
  invalid?: boolean;
};

export function Label(props: LabelProps) {
  const { invalid, ...rest } = props;
  return (
    <RACLabel
      {...rest}
      className={clsx(
        "mb-2 inline-block text-sm font-medium",
        invalid && "text-danger-low",
        rest.className,
      )}
    />
  );
}
