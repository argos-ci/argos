import { useFormState, type Control, type FieldValues } from "react-hook-form";

import { Button, ButtonProps } from "./Button";

interface FormSubmitProps<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
> extends ButtonProps {
  disableIfPristine?: boolean;
  control: Control<TFieldValues, TContext, TTransformedValues>;
}

export function FormSubmit<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>(props: FormSubmitProps<TFieldValues, TContext, TTransformedValues>) {
  const { control, disabled: disabledProp } = props;
  const formState = useFormState({ control });
  const disabled =
    disabledProp || (props.disableIfPristine && !formState.isDirty);
  return (
    <Button
      type="submit"
      {...props}
      // Keeps focus off the submit button when it is pressed, so a `setError`
      // in `onSubmit` can put it on the offending field instead. This was
      // react-aria's `preventFocusOnPress`; refusing the mousedown is what it
      // did underneath.
      onMouseDown={(event) => event.preventDefault()}
      disabled={disabled}
      pending={props.pending || formState.isSubmitting}
    >
      {props.children ?? "Save"}
    </Button>
  );
}
