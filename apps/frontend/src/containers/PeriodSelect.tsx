import { invariant } from "@argos/util/invariant";
import { parseAsStringEnum, useQueryState } from "nuqs";

import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

export type PeriodsDefinition = Record<string, PeriodEntry>;

interface PeriodEntry {
  from: Date;
  label: string;
}

type PeriodKey<TDef extends PeriodsDefinition> = keyof TDef;

export interface PeriodState<TDef extends PeriodsDefinition> {
  value: PeriodKey<TDef>;
  setValue: (value: PeriodKey<TDef>) => void;
  definition: TDef;
}

/**
 * Hook to manage the period state in the URL search params.
 */
export function usePeriodState<TDef extends PeriodsDefinition>(input: {
  defaultValue: PeriodKey<TDef>;
  definition: TDef;
  paramName: string;
}): PeriodState<TDef> {
  const { paramName } = input;
  const { defaultValue, definition } = input;
  const [value, setValue] = useQueryState(
    paramName,
    // @ts-expect-error don't know how to solve it
    parseAsStringEnum<PeriodKey<TDef>>(Object.keys(definition)).withDefault(
      defaultValue,
    ),
  );

  return { value, setValue, definition };
}

/**
 * PeriodSelect component to select a period.
 */
export function PeriodSelect<TDef extends PeriodsDefinition>(props: {
  state: PeriodState<TDef>;
}) {
  const { state } = props;
  const { value, setValue, definition } = state;
  const current = definition[value];
  invariant(current, "Current period is not defined");
  return (
    <Select
      aria-label="Periods"
      value={String(value)}
      onChange={(value) => setValue(String(value))}
    >
      <SelectButton className="text-sm">{current.label}</SelectButton>
      <Popover>
        <ListBox>
          {Object.entries(definition).map(([key, entry]) => {
            return (
              <ListBoxItem key={key} id={key} textValue={entry.label}>
                <ListBoxItemLabel>{entry.label}</ListBoxItemLabel>
              </ListBoxItem>
            );
          })}
        </ListBox>
      </Popover>
    </Select>
  );
}
