import { clsx } from "clsx";
import {
  FieldError as AriaFieldError,
  FieldErrorProps as AriaFieldErrorProps,
} from "react-aria-components";

export function FieldError({ className, ...props }: AriaFieldErrorProps) {
  return (
    <AriaFieldError
      className={clsx("text-danger-low inline-block text-sm", className)}
      {...props}
    />
  );
}
