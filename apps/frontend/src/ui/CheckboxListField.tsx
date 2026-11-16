import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { Checkbox } from "./Checkbox";
import { CheckboxGroupField } from "./CheckboxGroup";
import { ErrorMessage } from "./ErrorMessage";

/**
 * A scrollable, bordered list of checkboxes bound to a form field holding the
 * ticked values, e.g. the projects a token or a webhook covers.
 */
export function CheckboxListField<TFieldValues extends FieldValues>(props: {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  options: { value: string; label: React.ReactNode }[];
  "aria-labelledby"?: string;
}) {
  const { control, name, options } = props;
  const { fieldState } = useController({ control, name });
  return (
    <div>
      <div className="max-h-48 overflow-auto rounded-md border p-3">
        <CheckboxGroupField
          control={control}
          name={name}
          aria-labelledby={props["aria-labelledby"]}
        >
          {options.map((option) => (
            <Checkbox
              key={option.value}
              name={option.value}
              invalid={Boolean(fieldState.error)}
            >
              {option.label}
            </Checkbox>
          ))}
        </CheckboxGroupField>
      </div>
      {fieldState.error && (
        <ErrorMessage className="mt-2">{fieldState.error.message}</ErrorMessage>
      )}
    </div>
  );
}
