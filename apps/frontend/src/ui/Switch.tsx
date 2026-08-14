import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { clsx } from "clsx";
import { Control, FieldValues, Path, useController } from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

type SwitchProps = BaseSwitch.Root.Props & {
  size?: "sm" | "md";
};

export function Switch(props: SwitchProps) {
  const { size = "md", className, ...rest } = props;
  return (
    // `Switch.Root` is the track *and* the button, so the state lives on it
    // directly — react-aria needed a wrapping label plus a `group` to get the
    // same classes onto a child.
    <BaseSwitch.Root
      {...rest}
      className={clsx(
        "focus-ring bg-ui border-thin box-border flex shrink-0 cursor-default rounded-full bg-clip-padding shadow-inner transition duration-200 ease-in-out",
        "active:bg-primary-active data-checked:bg-primary-solid data-checked:active:bg-primary-solid-active",
        "data-disabled:opacity-disabled",
        size === "sm" && "h-4.5 w-7.75 p-0.5",
        size === "md" && "h-6.5 w-11 p-0.75",
        className,
      )}
    >
      <BaseSwitch.Thumb
        className={clsx(
          "translate-x-0 rounded-full bg-[#FDFCFD] shadow-sm transition duration-200 ease-in-out data-checked:translate-x-full",
          size === "sm" && "size-3",
          size === "md" && "size-4.5",
        )}
      />
    </BaseSwitch.Root>
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
      disabled={field.disabled || props.disabled}
      onBlur={(event) => {
        field.onBlur();
        props.onBlur?.(event);
      }}
      name={field.name}
      onCheckedChange={(checked, eventDetails) => {
        field.onChange(checked);
        props.onCheckedChange?.(checked, eventDetails);
      }}
      checked={field.value}
    />
  );
}
