import { useId } from "react";
import { InfoIcon } from "lucide-react";
import { useFormContext } from "react-hook-form";

import { FormError } from "./FormError";
import { Label } from "./Label";
import {
  TextInput,
  TextInputAddon,
  TextInputGroup,
  TextInputProps,
} from "./TextInput";
import { Tooltip } from "./Tooltip";

type FormTextInputProps = {
  name: string;
  label: React.ReactNode;
  hiddenLabel?: boolean;
  addon?: React.ReactNode;
  description?: React.ReactNode;
} & TextInputProps;

export function FormTextInput({
  label,
  id: idProp,
  hiddenLabel = false,
  name,
  disabled,
  className,
  addon,
  description,
  ...props
}: FormTextInputProps) {
  const form = useFormContext();
  const { isSubmitting } = form.formState;
  const error = form.getFieldState(name)?.error;
  const genId = useId();
  const id = idProp || genId;
  const invalid = Boolean(error);
  const input = (
    <TextInput
      id={id}
      name={name}
      aria-invalid={invalid ? "true" : undefined}
      aria-label={hiddenLabel && typeof label === "string" ? label : undefined}
      disabled={disabled || isSubmitting}
      {...props}
    />
  );
  return (
    <div className={className}>
      {!hiddenLabel && (
        <Label htmlFor={id} invalid={invalid}>
          {label}
          {description && (
            <Tooltip content={description}>
              <InfoIcon className="ml-1 inline size-[1em]" />
            </Tooltip>
          )}
        </Label>
      )}
      {addon ? (
        <TextInputGroup>
          {input}
          <TextInputAddon>{addon}</TextInputAddon>
        </TextInputGroup>
      ) : (
        input
      )}
      {typeof error?.message === "string" && (
        <FormError className="mt-2">{error.message}</FormError>
      )}
    </div>
  );
}
