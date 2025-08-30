import { useId } from "react";
import clsx from "clsx";
import { InfoIcon } from "lucide-react";
import {
  useFormState,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { ErrorMessage } from "./ErrorMessage";
import { Label } from "./Label";
import {
  TextInput,
  TextInputAddon,
  TextInputGroup,
  TextInputProps,
} from "./TextInput";
import { Tooltip } from "./Tooltip";

interface FormTextInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
> extends Omit<TextInputProps, "form"> {
  control: Control<TFieldValues, TContext, TTransformedValues>;
  name: Path<TFieldValues>;
  label: React.ReactNode;
  hiddenLabel?: boolean;
  addon?: React.ReactNode;
  description?: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  inline?: boolean;
}

export function FormTextInput<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>({
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
  control,
  ...props
}: FormTextInputProps<TFieldValues, TContext, TTransformedValues>) {
  const { isSubmitting } = useFormState({ control });
  const { error } = control.getFieldState(name);
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
