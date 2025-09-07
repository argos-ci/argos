import { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";
import { Switch as RACSwitch } from "react-aria-components";
import { Control, FieldValues, Path, useController } from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

type SwitchProps = ComponentPropsWithRef<typeof RACSwitch> & {
  size?: "sm" | "md";
};

function Switch(props: SwitchProps) {
  const { size = "md", ...rest } = props;
  return (
    <RACSwitch {...rest} className={clsx("group", rest.className)}>
      <div
        className={clsx(
          "rac-focus-group group-data-[pressed]:bg-primary-active group-data-[selected]:bg-primary-solid group-data-[selected]:group-data-[pressed]:bg-primary-solid-active bg-ui border-low group-data-[disabled]:opacity-disabled box-border flex shrink-0 cursor-default rounded-full border bg-clip-padding shadow-inner transition duration-200 ease-in-out",
          size === "sm" && "h-[18px] w-[31px] p-[2px]",
          size === "md" && "h-[26px] w-[44px] p-[3px]",
        )}
      >
        <span
          className={clsx(
            "translate-x-0 rounded-full bg-[#FDFCFD] shadow-sm transition duration-200 ease-in-out group-data-[selected]:translate-x-full",
            size === "sm" && "h-[12px] w-[12px]",
            size === "md" && "h-[18px] w-[18px]",
          )}
        />
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
  const { field } = useController({ control, name });
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
