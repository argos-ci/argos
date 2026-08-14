import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import {
  useController,
  type FieldValues,
  type Path,
  type UseControllerProps,
} from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

interface CheckboxProps
  // `ref` too: Base UI points it at the box it renders, and this component's
  // ref has always addressed the row, which is what `CheckboxField` hands to
  // react-hook-form.
  extends
    Omit<BaseCheckbox.Root.Props, "className" | "ref">,
    React.RefAttributes<HTMLLabelElement> {
  className?: string;
  /**
   * Mark the field as failing validation. Base UI sources this from a
   * `Field.Root`; the kit takes it as a prop, since these checkboxes are driven
   * by react-hook-form rather than by Base UI's own validation.
   */
  invalid?: boolean;
}

export function Checkbox(props: CheckboxProps) {
  const {
    ref,
    className,
    children,
    disabled,
    invalid,
    indeterminate,
    ...rest
  } = props;
  return (
    // `Checkbox.Root` is the box, not the row, so the label around it stays a
    // plain element. It carries the state as data attributes because the row
    // styles itself by them and `FormCheckbox`'s sibling label reads them
    // through `peer-data-disabled:`.
    <label
      ref={ref}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      className={clsx(
        "group/checkbox peer flex items-center gap-x-2",
        "data-disabled:opacity-disabled",
        "data-invalid:text-danger-low",
        className,
      )}
    >
      <BaseCheckbox.Root
        {...rest}
        disabled={disabled}
        indeterminate={indeterminate}
        className={clsx(
          "border-primary flex size-4 shrink-0 items-center justify-center rounded-sm border",
          /* Focus visible */
          "focus-visible:ring-primary focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:outline-hidden",
          /* Checked */
          "data-indeterminate:bg-primary-active data-checked:bg-primary-active data-indeterminate:text-primary data-checked:text-primary",
          /* Disabled */
          "data-disabled:opacity-disabled data-disabled:cursor-not-allowed",
          /* Hover */
          "hover:border-primary-hover hover:bg-primary-hover",
          /* Invalid — read from the row, which is where the prop lands */
          "group-data-invalid/checkbox:border-danger group-data-invalid/checkbox:hover:border-danger-hover group-data-invalid/checkbox:hover:bg-danger-hover group-data-invalid/checkbox:data-checked:bg-danger-subtle group-data-invalid/checkbox:data-checked:text-danger-low",
        )}
      >
        <BaseCheckbox.Indicator className="flex">
          {indeterminate ? (
            <Minus className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      {children}
    </label>
  );
}

export type CheckboxFieldProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> = Pick<UseControllerProps<TFieldValues, TName>, "rules"> &
  Required<Pick<UseControllerProps<TFieldValues, TName>, "control" | "name">> &
  CheckboxProps;

export function CheckboxField<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>(props: CheckboxFieldProps<TFieldValues, TName>) {
  const { ref, control, name, rules, ...rest } = props;
  const { field } = useController({
    control,
    name,
    rules,
  });
  const mergedRef = mergeRefs(field.ref, ref);
  return (
    <Checkbox
      {...rest}
      ref={mergedRef}
      disabled={field.disabled || props.disabled}
      onBlur={(event) => {
        field.onBlur();
        props.onBlur?.(event);
      }}
      name={field.name}
      onCheckedChange={(checked, eventDetails) => {
        field.onChange(checked);
        props.onCheckedChange?.(checked, eventDetails);
      }}
      checked={field.value}
    />
  );
}
