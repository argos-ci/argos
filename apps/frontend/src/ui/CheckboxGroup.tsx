import clsx from "clsx";
import {
  CheckboxGroup as AriaCheckboxGroup,
  CheckboxGroupProps as AriaCheckboxGroupProps,
  composeRenderProps,
  FieldErrorContext,
} from "react-aria-components";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

interface CheckboxGroupProps
  extends AriaCheckboxGroupProps,
    React.RefAttributes<HTMLDivElement> {
  label?: string;
  description?: string;
}

export function CheckboxGroup({
  ref,
  className,
  ...props
}: CheckboxGroupProps) {
  return (
    <AriaCheckboxGroup
      ref={ref}
      className={composeRenderProps(className, (className) =>
        clsx("group flex flex-col gap-2", className),
      )}
      {...props}
    />
  );
}

export type CheckboxGroupFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  children: React.ReactNode;
} & Omit<CheckboxGroupProps, "children">;

export function CheckboxGroupField<TFieldValues extends FieldValues>(
  props: CheckboxGroupFieldProps<TFieldValues>,
) {
  const { ref, control, name, isDisabled, onBlur, ...rest } = props;
  const { field, fieldState } = useController({ control, name });
  const mergedRef = mergeRefs(field.ref, ref);
  return (
    <CheckboxGroup
      ref={mergedRef}
      isDisabled={field.disabled || isDisabled}
      onBlur={(event) => {
        field.onBlur();
        onBlur?.(event);
      }}
      onChange={field.onChange}
      value={field.value}
      name={field.name}
      validationBehavior="aria"
      isInvalid={Boolean(fieldState.error?.message)}
      {...rest}
    >
      <FieldErrorContext.Provider
        value={
          fieldState.error?.message
            ? {
                validationDetails: fieldState.error
                  .type as unknown as ValidityState,
                isInvalid: true,
                validationErrors: fieldState.error?.message
                  ? [fieldState.error.message]
                  : [],
              }
            : null
        }
      >
        {rest.children}
      </FieldErrorContext.Provider>
    </CheckboxGroup>
  );
}
