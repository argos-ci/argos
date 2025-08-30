import { useFormState, type Control, type FieldValues } from "react-hook-form";

import { ErrorMessage } from "./ErrorMessage";

interface FormRootErrorProps<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
> {
  control: Control<TFieldValues, TContext, TTransformedValues>;
  className?: string;
}

export function FormRootError<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>(props: FormRootErrorProps<TFieldValues, TContext, TTransformedValues>) {
  const { control } = props;
  const formState = useFormState({ control });
  if (!formState.errors.root?.serverError) {
    return null;
  }
  return (
    <ErrorMessage className={props.className}>
      {formState.errors.root.serverError.message}
    </ErrorMessage>
  );
}
