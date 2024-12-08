import { useId } from "react";
import { useFormContext } from "react-hook-form";

import { FormError } from "./FormError";
import { Label } from "./Label";
import { TextInput, TextInputProps } from "./TextInput";

type FormTextInputProps = {
  name: string;
  label: React.ReactNode;
  hiddenLabel?: boolean;
} & TextInputProps;

export function FormTextInput({
  label,
  id: idProp,
  hiddenLabel = false,
  name,
  disabled,
  className,
  ...props
}: FormTextInputProps) {
  const form = useFormContext();
  const { isSubmitting } = form.formState;
  const error = form.getFieldState(name)?.error;
  const genId = useId();
  const id = idProp || genId;
  const invalid = Boolean(error);
  return (
    <div className={className}>
      {!hiddenLabel && (
        <Label htmlFor={id} invalid={invalid}>
          {label}
        </Label>
      )}
      <TextInput
        id={id}
        name={name}
        aria-invalid={invalid ? "true" : undefined}
        aria-label={
          hiddenLabel && typeof label === "string" ? label : undefined
        }
        disabled={disabled || isSubmitting}
        {...props}
      />
      {typeof error?.message === "string" && (
        <FormError className="mt-2">{error.message}</FormError>
      )}
    </div>
  );
}
