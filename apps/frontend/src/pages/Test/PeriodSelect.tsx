import { useEffect } from "react";
import { invariant } from "@argos/util/invariant";
import { useSearchParams } from "react-router-dom";

import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { useEventCallback } from "@/ui/useEventCallback";

export type PeriodsDefinition = Record<string, PeriodEntry>;

interface PeriodEntry {
  from: Date;
  to: Date | null;
  label: string;
}

type PeriodKey<TDef extends PeriodsDefinition> = keyof TDef;

export interface PeriodState<TDef extends PeriodsDefinition> {
  value: PeriodKey<TDef>;
  setValue: (value: PeriodKey<TDef>) => void;
  definition: TDef;
}

function parsePeriod<TDef extends PeriodsDefinition>(input: {
  defaultValue: PeriodKey<TDef>;
  definition: TDef;
  value: string | null;
}): PeriodKey<TDef> {
  const { defaultValue, definition, value } = input;
  return value && Object.keys(definition).includes(value)
    ? value
    : defaultValue;
}

/**
 * Hook to manage the period state in the URL search params.
 */
export function usePeriodState<TDef extends PeriodsDefinition>(input: {
  defaultValue: PeriodKey<TDef>;
  definition: TDef;
}): PeriodState<TDef> {
  const { defaultValue, definition } = input;
  const [params, setParams] = useSearchParams();
  const value = parsePeriod({
    defaultValue,
    definition,
    value: params.get("period"),
  });

  const setValue = useEventCallback((value: PeriodKey<TDef>) => {
    if (value === defaultValue) {
      if (params.has("period")) {
        const next = new URLSearchParams(params);
        next.delete("period");
        setParams(next);
      }
      return;
    }
    if (String(value) !== params.get("period")) {
      const next = new URLSearchParams(params);
      next.set("period", String(value));
      setParams(next);
    }
  });

  useEffect(() => {
    setValue(value);
  }, [setValue, value]);

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
      selectedKey={String(value)}
      onSelectionChange={(value) => setValue(String(value))}
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
