import { useFormContext } from "react-hook-form";

import { Button, ButtonProps } from "./Button";

export function FormSubmit({
  children,
  disabledIfSubmitted,
  ...props
}: ButtonProps & {
  disabledIfSubmitted?: boolean;
}) {
  const { formState } = useFormContext();
  const isDisabled =
    props.isDisabled ||
    formState.isSubmitting ||
    (disabledIfSubmitted && formState.isSubmitted);
  return (
    <Button type="submit" isDisabled={isDisabled} {...props}>
      {children ?? "Save"}
    </Button>
  );
}
