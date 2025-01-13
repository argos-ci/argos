import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";
import { Switch as RACSwitch } from "react-aria-components";
import { Control, FieldValues, Path, useController } from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

type SwitchProps = ComponentPropsWithRef<typeof RACSwitch>;

function Switch(props: SwitchProps) {
  return (
    <RACSwitch
      {...props}
      className={clsx("group flex items-center gap-2", props.className)}
    >
      <div className="rac-focus-group group-data-[pressed]:bg-primary-active group-data-[selected]:bg-primary-solid group-data-[selected]:group-data-[pressed]:bg-primary-solid-active bg-ui border-low group-data-[disabled]:opacity-disabled box-border flex h-[26px] w-[44px] shrink-0 cursor-default rounded-full border bg-clip-padding p-[3px] shadow-inner transition duration-200 ease-in-out">
        <span className="size-[18px] translate-x-0 rounded-full bg-[#FDFCFD] shadow transition duration-200 ease-in-out group-data-[selected]:translate-x-full" />
      </div>
    </RACSwitch>
  );
}

export type SwitchFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
} & SwitchProps;

export function SwitchField<TFieldValues extends FieldValues>(
  props: SwitchFieldProps<TFieldValues>,
) {
  const { ref, control, name, ...rest } = props;
  const { field } = useController({
    control,
    name,
  });
  const mergedRef = mergeRefs(field.ref, ref);
  return (
    <Switch
      {...rest}
      ref={mergedRef}
      isDisabled={field.disabled || props.isDisabled}
      onBlur={(event) => {
        field.onBlur();
        props.onBlur?.(event);
      }}
      name={field.name}
      onChange={(isSelected) => {
        field.onChange(isSelected);
        props.onChange?.(isSelected);
      }}
      isSelected={field.value}
    />
  );
}
