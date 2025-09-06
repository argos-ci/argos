import { useEffect } from "react";
import { useFormState, type Control, type FieldValues } from "react-hook-form";
import { toast } from "sonner";

import { ErrorMessage } from "./ErrorMessage";

interface FormRootErrorProps<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
> {
  control: Control<TFieldValues, TContext, TTransformedValues>;
  className?: string;
}

/**
 * Display a form root error message if present.
 */
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

/**
 * Display a toast notification for a form root error if present.
 */
export function FormRootToastError<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>(props: FormRootErrorProps<TFieldValues, TContext, TTransformedValues>) {
  const { control } = props;
  const formState = useFormState({ control });
  const rootError = formState.errors.root?.serverError;
  useEffect(() => {
    if (rootError) {
      toast.error(rootError.message);
    }
  }, [rootError]);
  return null;
}
