import type { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";
import { CheckIcon } from "lucide-react";
import { useFormState, type Control, type FieldValues } from "react-hook-form";

interface FormSuccessProps<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
> extends ComponentPropsWithRef<"div"> {
  control: Control<TFieldValues, TContext, TTransformedValues>;
  isSuccessful?: boolean;
}

export function FormSuccess<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>({
  className,
  children,
  isSuccessful,
  ...props
}: FormSuccessProps<TFieldValues, TContext, TTransformedValues>) {
  const { control, ...rest } = props;
  const formState = useFormState({ control });
  if (!isSuccessful && !formState.isSubmitSuccessful) {
    return null;
  }
  return (
    <div
      className={clsx(className, "flex items-center gap-2 font-medium")}
      {...rest}
    >
      <CheckIcon className="text-success size-4" />
      {children}
    </div>
  );
}
