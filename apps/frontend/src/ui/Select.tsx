import type { RefAttributes } from "react";
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
    <span aria-hidden="true" className="shrink-0">
      <ChevronDownIcon className="size-4" />
    </span>
  );
}

interface SelectProps<T extends object>
  extends AriaSelectSelectProps<T>, React.RefAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Select<T extends object>(props: SelectProps<T>) {
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

type SelectFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  children: React.ReactNode;
} & Omit<SelectProps<object>, "children">;

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
      value={field.value}
      onChange={(isSelected) => {
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

export interface SelectButtonProps
  extends ButtonProps, RefAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: "sm" | "md";
}

export function SelectButton({
  children,
  size = "md",
  ...rest
}: SelectButtonProps) {
  return (
    <Button
      {...rest}
      className={clsx(
        /* Appearance */
        "bg-app border-thin cursor-default appearance-none rounded-lg shadow-2xs select-none",
        /* Layout */
        "flex items-center justify-between",
        /* Focus */
        "group-data-focused/select:border-hover group-data-focus-visible/select:ring-primary-active group-data-focus-visible/select:ring-2 group-data-focused/select:outline-hidden",
        /* Hover */
        "data-hovered:border-hover",
        /* Disabled */
        "group-data-disabled/select:opacity-disabled group-data-disabled/select:cursor-not-allowed",
        /* Invalid */
        "group-data-invalid/select:border-danger group-data-invalid/select:group-data-focused/select:border-danger-hover group-data-invalid/select:data-hovered:border-danger-hover",
        /* Placeholder */
        "has-data-placeholder:text-low",
        /* Expanded */
        "aria-expanded:shadow-none",
        {
          md: "gap-2 px-3 py-1.5 text-base leading-5",
          sm: "gap-2 px-2 py-1 text-sm leading-4",
        }[size],
        rest.className,
      )}
    >
      {/* The value gets its own shrinkable box — `*:min-w-0` so the value inside
          it may shrink too. On a fixed-width select, a value wider than the
          button (a long channel name, say) used to push the arrow out through
          the right padding instead of being ellipsized. */}
      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden *:min-w-0">
        {children}
      </span>
      <SelectArrow />
    </Button>
  );
}
