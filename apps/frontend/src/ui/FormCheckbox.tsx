import { useId } from "react";
import { InfoIcon } from "lucide-react";
import { FieldValues, type Path } from "react-hook-form";

import { CheckboxField, type CheckboxFieldProps } from "./Checkbox";
import { ErrorMessage } from "./ErrorMessage";
import { Tooltip } from "./Tooltip";

export function FormCheckbox<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>({
  className,
  id: idProp,
  label,
  description,
  ...props
}: Omit<CheckboxFieldProps<TFieldValues, TName>, "className"> & {
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  const genId = useId();
  const id = idProp ?? genId;
  const { error } = props.control.getFieldState(props.name);
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <CheckboxField id={id} {...props} />
        <label
          htmlFor={id}
          className="peer-data-[disabled]:opacity-disabled inline-block text-sm select-none"
        >
          {label}
          {description && (
            <>
              {" "}
              {
                <Tooltip content={description}>
                  <InfoIcon className="ml-1 inline size-[1em]" />
                </Tooltip>
              }
            </>
          )}
        </label>
      </div>
      {typeof error?.message === "string" && (
        <ErrorMessage className="mt-2">{error.message}</ErrorMessage>
      )}
    </div>
  );
}
