import { forwardRef } from "react";
import { clsx } from "clsx";
import {
  ColorSwatchPickerItemProps,
  ColorSwatchPickerProps,
  ColorSwatchProps,
  ColorSwatch as RACColorSwatch,
  ColorSwatchPicker as RACColorSwatchPicker,
  ColorSwatchPickerItem as RACColorSwatchPickerItem,
} from "react-aria-components";

export const ColorSwatchPicker = forwardRef(function ColorSwatchPicker(
  props: ColorSwatchPickerProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <RACColorSwatchPicker
      ref={ref}
      {...props}
      className={clsx("flex flex-wrap gap-2", props.className)}
    />
  );
});

export const ColorSwatchPickerItem = forwardRef(function ColorSwatchPickerItem(
  props: ColorSwatchPickerItemProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <RACColorSwatchPickerItem
      ref={ref}
      {...props}
      className={clsx(
        "rac-focus relative w-fit rounded outline-none forced-color-adjust-none",
        "data-[selected]:ring-primary-active data-[selected]:ring-1 data-[selected]:ring-offset-1",
        props.className,
      )}
    />
  );
});

export const ColorSwatch = forwardRef(function ColorSwatch(
  props: ColorSwatchProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <RACColorSwatch
      ref={ref}
      {...props}
      className={clsx("size-6 rounded border", props.className)}
    />
  );
});
