import { clsx } from "clsx";
import { ChevronDownIcon } from "lucide-react";
import {
  Select as AriaSelect,
  Button,
  ButtonProps,
  FieldErrorContext,
  type SelectProps as AriaSelectSelectProps,
} from "react-aria-components";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

export { SelectValue } from "react-aria-components";

function SelectArrow() {
  return (
    <span aria-hidden="true">
      <ChevronDownIcon className="size-4" />
    </span>
  );
}

export interface SelectProps
  extends AriaSelectSelectProps,
    React.RefAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Select(props: SelectProps) {
  const { orientation = "vertical", ...rest } = props;
  return (
    <AriaSelect
      {...rest}
      className={clsx(
        "group/select flex gap-2",
        {
          horizontal: "items-center",
          vertical: "flex-col",
        }[orientation],
        props.className,
      )}
    />
  );
}

export type SelectFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  children: React.ReactNode;
} & Omit<SelectProps, "children">;

export function SelectField<TFieldValues extends FieldValues>(
  props: SelectFieldProps<TFieldValues>,
) {
  const { ref, control, name, isDisabled, onBlur, ...rest } = props;
  const { field, fieldState } = useController({ control, name });
  const mergedRef = mergeRefs(field.ref, ref);
  return (
    <Select
      ref={mergedRef}
      isDisabled={field.disabled || isDisabled}
      onBlur={(event) => {
        field.onBlur();
        onBlur?.(event);
      }}
      name={field.name}
      selectedKey={field.value}
      onSelectionChange={(isSelected) => {
        field.onChange(isSelected);
      }}
      isInvalid={fieldState.invalid}
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
    </Select>
  );
}

export function SelectButton({
  children,
  size = "md",
  ...rest
}: ButtonProps & {
  ref?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <Button
      {...rest}
      className={clsx(
        /* Appearance */
        "bg-app cursor-default select-none appearance-none rounded-sm border leading-tight",
        /* Layout */
        "flex items-center justify-between",
        /* Focus */
        "group-data-[focused]/select:border-active group-data-[focused]/select:outline-hidden",
        /* Hover */
        "data-[hovered]:border-hover",
        /* Disabled */
        "group-data-[disabled]/select:opacity-disabled group-data-[disabled]/select:cursor-not-allowed",
        /* Invalid */
        "group-data-[invalid]/select:border-danger group-data-[invalid]/select:group-data-[focused]/select:border-danger-active group-data-[invalid]/select:data-[hovered]:border-danger-hover",
        {
          md: "gap-2 px-3 py-2 text-base",
          sm: "gap-2 px-2 py-1 text-sm",
        }[size],
        rest.className,
      )}
    >
      {children}
      <SelectArrow />
    </Button>
  );
}
