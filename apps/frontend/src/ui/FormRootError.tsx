import { useFormContext } from "react-hook-form";

import { FormError } from "./FormError";

export const FormRootError = () => {
  const { formState } = useFormContext();
  if (!formState.errors.root?.serverError) {
    return null;
  }
  return <FormError>{formState.errors.root.serverError.message}</FormError>;
};
