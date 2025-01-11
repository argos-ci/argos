import { useFormContext } from "react-hook-form";

import { Button, ButtonProps } from "./Button";

export function FormSubmit({ children, ...props }: ButtonProps) {
  const { formState } = useFormContext();
  const isDisabled =
    props.isDisabled || formState.isSubmitting || !formState.isDirty;
  return (
    <Button type="submit" {...props} isDisabled={isDisabled}>
      {children ?? "Save"}
    </Button>
  );
}
