import { useId } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { clsx } from "clsx";

/**
 * A bordered list of options, one chosen at a time, each with a label and a
 * line of description: how a set of presets is offered (e.g. the permissions
 * of an OAuth application or of a project token).
 */
export function RadioOptionGroup(props: {
  value: string;
  /** Called with the chosen option's value, to narrow to the caller's type. */
  onValueChange: (value: unknown) => void;
  "aria-labelledby"?: string;
  children: React.ReactNode;
}) {
  const { value, onValueChange, children } = props;
  return (
    <BaseRadioGroup
      aria-labelledby={props["aria-labelledby"]}
      value={value}
      onValueChange={(next) => onValueChange(next)}
      className="border-thin divide-y-thin overflow-hidden rounded-lg"
    >
      {children}
    </BaseRadioGroup>
  );
}

export function RadioOption(props: {
  value: string;
  label: string;
  description: string;
}) {
  const { value, label, description } = props;
  const labelId = useId();
  const descriptionId = useId();
  return (
    // Base UI renders each radio's hidden input beside it: without a wrapper,
    // the input would count as a row of the list and draw its own divider.
    <div>
      <Radio.Root
        value={value}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        className={clsx(
          "group/option flex w-full cursor-default items-start gap-3 px-4 py-3 select-none",
          "data-checked:bg-primary-subtle not-data-checked:hover:bg-subtle",
          "focus-visible:ring-primary-active focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset",
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "border-primary mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
            "group-data-checked/option:border-primary-active group-data-checked/option:bg-primary-solid",
          )}
        >
          <span className="hidden size-1.5 rounded-full bg-white group-data-checked/option:block" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span id={labelId} className="text-sm font-medium">
            {label}
          </span>
          <span id={descriptionId} className="text-low text-xs">
            {description}
          </span>
        </span>
      </Radio.Root>
    </div>
  );
}
