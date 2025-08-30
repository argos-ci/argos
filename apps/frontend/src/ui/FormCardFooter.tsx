import type { Control, FieldValues } from "react-hook-form";

import { CardFooter } from "./Card";
import { FormRootError } from "./FormRootError";
import { FormSubmit } from "./FormSubmit";
import { FormSuccess } from "./FormSuccess";

export function FormCardFooter<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>(props: {
  children?: React.ReactNode;
  isDisabled?: boolean;
  isSuccessful?: boolean;
  control: Control<TFieldValues, TContext, TTransformedValues>;
}) {
  const { control, children, isDisabled, isSuccessful } = props;
  return (
    <CardFooter className="flex items-center justify-between gap-4">
      <div>{children}</div>
      <div className="flex items-center justify-end gap-4">
        <FormRootError control={control} />
        <FormSuccess control={control} isSuccessful={isSuccessful}>
          Saved
        </FormSuccess>
        <FormSubmit
          control={control}
          isDisabled={isDisabled}
          disableIfPristine
        />
      </div>
    </CardFooter>
  );
}
