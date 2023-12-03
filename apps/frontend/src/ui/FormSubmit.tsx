import { useFormContext } from "react-hook-form";

import { Button, ButtonProps } from "./Button";

export const FormSubmit = ({
  children,
  disabledIfSubmitted,
  ...props
}: ButtonProps & {
  disabledIfSubmitted?: boolean;
}) => {
  const { formState } = useFormContext();
  const disabled =
    props.disabled ||
    formState.isSubmitting ||
    (disabledIfSubmitted && formState.isSubmitted);
  return (
    <Button type="submit" disabled={disabled} {...props}>
      {children ?? "Save"}
    </Button>
  );
};
