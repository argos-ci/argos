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
  const { control, isDisabled: isDisabledProp } = props;
  const formState = useFormState({ control });
  const isDisabled =
    isDisabledProp ||
    formState.isSubmitting ||
    (props.disableIfPristine && !formState.isDirty);
  return (
    <Button
      type="submit"
      {...props}
      // Required to focus correctly the field when we use `setError` in the `onSubmit`
      preventFocusOnPress
      isDisabled={isDisabled}
    >
      {props.children ?? "Save"}
    </Button>
  );
}
