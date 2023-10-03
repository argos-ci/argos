import { useFormContext } from "react-hook-form";

import { Button, ButtonProps } from "./Button";

export type FormSubmitProps = ButtonProps & {
  disabledIfSubmitted?: boolean;
};

export const FormSubmit = ({
  children,
  disabledIfSubmitted,
  ...props
}: FormSubmitProps) => {
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
