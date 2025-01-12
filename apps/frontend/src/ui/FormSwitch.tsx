import { useId } from "react";
import { clsx } from "clsx";
import { FieldValues, useController } from "react-hook-form";

import { SwitchField, SwitchFieldProps } from "./Switch";

export function FormSwitch<TFieldValues extends FieldValues>({
  className,
  id: idProp,
  label,
  ...props
}: SwitchFieldProps<TFieldValues> & {
  label: React.ReactNode;
}) {
  const genId = useId();
  const id = idProp ?? genId;
  const { field } = useController({
    control: props.control,
    name: props.name,
  });
  return (
    <div className={clsx(className, "flex flex-col gap-2")}>
      <label htmlFor={id} className="text-low text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <SwitchField id={id} {...props} />
        <label
          aria-hidden
          htmlFor={id}
          className="peer-data-[disabled]:opacity-disabled inline-block select-none text-sm font-medium"
        >
          {field.value ? "Enabled" : "Disabled"}
        </label>
      </div>
    </div>
  );
}
