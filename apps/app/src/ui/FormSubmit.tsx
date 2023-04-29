import { useFormContext } from "react-hook-form";

import { Button, ButtonProps } from "./Button";

export const FormSubmit = ({ children, ...props }: ButtonProps) => {
  const { formState } = useFormContext();
  return (
    <Button type="submit" disabled={formState.isSubmitting} {...props}>
      {children ?? "Save"}
    </Button>
  );
};
