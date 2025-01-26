import { clsx } from "clsx";
import {
  ColorSwatchPickerItemProps,
  ColorSwatchPickerProps,
  ColorSwatchProps,
  ColorSwatch as RACColorSwatch,
  ColorSwatchPicker as RACColorSwatchPicker,
  ColorSwatchPickerItem as RACColorSwatchPickerItem,
} from "react-aria-components";

export function ColorSwatchPicker(
  props: ColorSwatchPickerProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACColorSwatchPicker
      {...props}
      className={clsx("flex flex-wrap gap-2", props.className)}
    />
  );
}

export function ColorSwatchPickerItem(
  props: ColorSwatchPickerItemProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACColorSwatchPickerItem
      {...props}
      className={clsx(
        "rac-focus outline-hidden relative w-fit rounded-sm forced-color-adjust-none",
        "data-[selected]:ring-primary-active data-[selected]:ring-1 data-[selected]:ring-offset-1",
        props.className,
      )}
    />
  );
}

export function ColorSwatch(
  props: ColorSwatchProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACColorSwatch
      {...props}
      className={clsx("size-6 rounded-sm border", props.className)}
    />
  );
}
