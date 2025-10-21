import { useId } from "react";
import { InfoIcon } from "lucide-react";
import { FieldValues, useWatch } from "react-hook-form";

import { Label } from "./Label";
import { SwitchField, SwitchFieldProps } from "./Switch";
import { Tooltip } from "./Tooltip";

export function FormSwitch<TFieldValues extends FieldValues>({
  className,
  id: idProp,
  label,
  description,
  ...props
}: Omit<SwitchFieldProps<TFieldValues>, "className"> & {
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  const genId = useId();
  const id = idProp ?? genId;
  const value = useWatch({
    name: props.name,
    control: props.control,
  });
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-low text-sm font-medium">
        {label}
        {description && (
          <Tooltip content={description}>
            <InfoIcon className="ml-1 inline size-[1em]" />
          </Tooltip>
        )}
      </Label>
      <div className="flex items-center gap-2">
        <SwitchField id={id} {...props} />
        <label
          aria-hidden
          htmlFor={id}
          className="peer-data-[disabled]:opacity-disabled inline-block text-sm font-medium select-none"
        >
          {value ? "Enabled" : "Disabled"}
        </label>
      </div>
    </div>
  );
}
