import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import clsx from "clsx";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

import { FieldErrorContext } from "./FieldError";

interface CheckboxGroupProps
  extends
    Omit<BaseCheckboxGroup.Props, "className" | "ref">,
    React.RefAttributes<HTMLDivElement> {
  className?: string;
  label?: string;
  description?: string;
}

/**
 * A set of checkboxes sharing one value.
 *
 * Members are identified by each checkbox's `name`, not its `value` — that is
 * the one behavioural difference from react-aria's version, and the group's
 * value is an array of the ticked checkboxes' names.
 */
function CheckboxGroup({ ref, className, ...props }: CheckboxGroupProps) {
  return (
    <BaseCheckboxGroup
      ref={ref}
      className={clsx("group flex flex-col gap-2", className)}
      {...props}
    />
  );
}

type CheckboxGroupFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  children: React.ReactNode;
} & Omit<CheckboxGroupProps, "children">;

export function CheckboxGroupField<TFieldValues extends FieldValues>(
  props: CheckboxGroupFieldProps<TFieldValues>,
) {
  const { ref, control, name, disabled, ...rest } = props;
  const { field, fieldState } = useController({ control, name });
  const mergedRef = mergeRefs(field.ref, ref);
  return (
    <CheckboxGroup
      ref={mergedRef}
      disabled={field.disabled || disabled}
      onValueChange={field.onChange}
      value={field.value}
      onBlur={field.onBlur}
      {...rest}
    >
      <FieldErrorContext
        value={
          fieldState.error?.message
            ? { message: fieldState.error.message }
            : null
        }
      >
        {rest.children}
      </FieldErrorContext>
    </CheckboxGroup>
  );
}
