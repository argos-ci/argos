import {
  Control,
  FieldPathByValue,
  FieldValues,
  useController,
} from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

import { Editor, type EditorProps, type EditorValue } from "./Editor";

export type EditorFieldProps<TFieldValues extends FieldValues> = Omit<
  EditorProps,
  "defaultValue" | "onChange"
> & {
  control: Control<TFieldValues>;
  name: FieldPathByValue<TFieldValues, EditorValue>;
  onChange?: (value: EditorValue) => void;
};

export function EditorField<TFieldValues extends FieldValues>(
  props: EditorFieldProps<TFieldValues>,
) {
  const { control, name, ref, onChange, onBlur, ...rest } = props;
  const { field } = useController({ control, name });
  const mergedRef = mergeRefs(field.ref, ref);
  return (
    <Editor
      {...rest}
      defaultValue={field.value as EditorValue}
      onChange={(value) => {
        field.onChange(value);
        onChange?.(value);
      }}
      onBlur={() => {
        field.onBlur();
        onBlur?.();
      }}
      ref={mergedRef as React.Ref<HTMLElement>}
    />
  );
}
