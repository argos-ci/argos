import { createContext, use, type ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

/**
 * The error a field is currently showing, `null` when it is valid.
 *
 * A control provides this so the `<FieldError />` placed anywhere beneath it
 * renders the message without the call site threading it down. `SelectField`
 * and `CheckboxGroupField` fill it from react-hook-form's `fieldState`.
 *
 * This replaces react-aria's `FieldErrorContext`, whose shape carried a
 * `ValidityState` and an array of messages because react-aria ran the
 * validation itself. Here react-hook-form owns validation and hands over one
 * message, so that is all this holds.
 */
export const FieldErrorContext = createContext<{ message: string } | null>(
  null,
);

export function FieldError({
  className,
  children,
  ...props
}: ComponentPropsWithRef<"span">) {
  const context = use(FieldErrorContext);
  // An explicit child wins, for the call sites that render their own message
  // without a surrounding field.
  const content = children ?? context?.message;
  if (!content) {
    return null;
  }
  return (
    <span
      {...props}
      className={clsx("text-danger-low inline-block text-sm", className)}
    >
      {content}
    </span>
  );
}
