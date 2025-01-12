import { useFormContext } from "react-hook-form";

import { Button, ButtonProps } from "./Button";

export function FormSubmit({
  children,
  ...props
}: ButtonProps & {
  disableIfPristine?: boolean;
}) {
  const { formState } = useFormContext();
  const isDisabled =
    props.isDisabled ||
    formState.isSubmitting ||
    (props.disableIfPristine && !formState.isDirty);
  return (
    <Button type="submit" {...props} isDisabled={isDisabled}>
      {children ?? "Save"}
    </Button>
  );
}
