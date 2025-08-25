import { useId } from "react";
import clsx from "clsx";
import { InfoIcon } from "lucide-react";
import { useFormContext } from "react-hook-form";

import { ErrorMessage } from "./ErrorMessage";
import { Label } from "./Label";
import {
  TextInput,
  TextInputAddon,
  TextInputGroup,
  TextInputProps,
} from "./TextInput";
import { Tooltip } from "./Tooltip";

interface FormTextInputProps extends TextInputProps {
  name: string;
  label: React.ReactNode;
  hiddenLabel?: boolean;
  addon?: React.ReactNode;
  description?: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  inline?: boolean;
}

export function FormTextInput({
  label,
  id: idProp,
  hiddenLabel = false,
  name,
  disabled,
  className,
  addon,
  description,
  orientation = "vertical",
  inline = false,
  ...props
}: FormTextInputProps) {
  const form = useFormContext();
  const error = form.getFieldState(name)?.error;
  const { isSubmitting } = form.formState;
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
      autoComplete="off"
      {...props}
    />
  );
  return (
    <div
      className={clsx(
        inline ? "inline-flex" : "flex",
        { vertical: "flex-col", horizontal: "items-center" }[orientation],
        className,
      )}
    >
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
        <ErrorMessage
          className={{ vertical: "mt-2", horizontal: "ml-2" }[orientation]}
        >
          {error.message}
        </ErrorMessage>
      )}
    </div>
  );
}
