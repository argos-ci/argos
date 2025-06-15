import clsx from "clsx";
import {
  CheckboxGroup as AriaCheckboxGroup,
  CheckboxGroupProps as AriaCheckboxGroupProps,
  ValidationResult as AriaValidationResult,
  composeRenderProps,
  Text,
} from "react-aria-components";

import { FieldError } from "./FieldError";
import { Label } from "./Label";

interface CheckboxGroupProps
  extends AriaCheckboxGroupProps,
    React.RefAttributes<HTMLDivElement> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: AriaValidationResult) => string);
}

export function CheckboxGroup({
  ref,
  label,
  description,
  errorMessage,
  className,
  children,
  ...props
}: CheckboxGroupProps) {
  return (
    <AriaCheckboxGroup
      ref={ref}
      className={composeRenderProps(className, (className) =>
        clsx("group flex flex-col gap-2", className),
      )}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          {label && <Label>{label}</Label>}
          {children}
          {description && (
            <Text className="text-low text-sm" slot="description">
              {description}
            </Text>
          )}
          <FieldError>{errorMessage}</FieldError>
        </>
      ))}
    </AriaCheckboxGroup>
  );
}
