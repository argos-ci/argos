import { invariant } from "@argos/util/invariant";
import { useFormContext, type UseFormReturn } from "react-hook-form";

import { ErrorMessage } from "./ErrorMessage";

export function FormRootError(props: {
  form?: UseFormReturn<any, any, any>;
  className?: string;
}) {
  const contextForm = useFormContext();
  const form = props.form || contextForm;
  invariant(form, "A form must be provided to FormRootError");
  if (!form.formState.errors.root?.serverError) {
    return null;
  }
  return (
    <ErrorMessage className={props.className}>
      {form.formState.errors.root.serverError.message}
    </ErrorMessage>
  );
}
