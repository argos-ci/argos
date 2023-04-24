import { forwardRef, useId } from "react";
import { FieldError } from "react-hook-form";

import { FormError } from "./FormError";
import { FormLabel } from "./FormLabel";
import { TextInput, TextInputProps } from "./TextInput";

type FormTextInputProps = {
  label: string;
  error?: FieldError;
} & TextInputProps;

export const FormTextInput = forwardRef<HTMLInputElement, FormTextInputProps>(
  ({ label, id: idProp, error, ...props }, ref) => {
    const genId = useId();
    const id = idProp || genId;
    const invalid = Boolean(error);
    return (
      <div>
        <FormLabel htmlFor={id} invalid={invalid}>
          {label}
        </FormLabel>
        <TextInput
          ref={ref}
          id={id}
          aria-invalid={invalid ? "true" : undefined}
          {...props}
        />
        {error?.message && (
          <FormError className="mt-2">{error.message}</FormError>
        )}
      </div>
    );
  }
);
