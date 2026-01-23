import { invariant } from "@argos/util/invariant";
import moment from "moment";
import { useSearchParams } from "react-router-dom";

import { MetricsPeriod } from "@/gql/graphql";
import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { useEventCallback } from "@/ui/useEventCallback";

const now = new Date();

export const TEST_METRICS_PERIOD = {
  [MetricsPeriod.Last_24Hours]: {
    from: moment(now).subtract(24, "hours").toDate(),
    label: "Last 24 hours",
  },
  [MetricsPeriod.Last_3Days]: {
    from: moment(now).subtract(3, "days").startOf("day").toDate(),
    label: "Last 3 days",
  },
  [MetricsPeriod.Last_7Days]: {
    from: moment(now).subtract(7, "days").startOf("day").toDate(),
    label: "Last 7 days",
  },
  [MetricsPeriod.Last_30Days]: {
    from: moment(now).subtract(30, "days").startOf("day").toDate(),
    label: "Last 30 days",
  },
  [MetricsPeriod.Last_90Days]: {
    from: moment(now).subtract(90, "days").startOf("day").toDate(),
    label: "Last 90 days",
  },
} satisfies PeriodsDefinition;

export type TestMetricPeriodState = PeriodState<typeof TEST_METRICS_PERIOD>;

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
  paramName: string;
}): PeriodState<TDef> {
  const { paramName } = input;
  const { defaultValue, definition } = input;
  const [params, setParams] = useSearchParams();
  const value = parsePeriod({
    defaultValue,
    definition,
    value: params.get(paramName),
  });

  const setValue = useEventCallback((value: PeriodKey<TDef>) => {
    if (value === defaultValue) {
      if (params.has(paramName)) {
        const next = new URLSearchParams(params);
        next.delete(paramName);
        setParams(next, { flushSync: true });
      }
      return;
    }
    if (String(value) !== params.get(paramName)) {
      const next = new URLSearchParams(params);
      next.set(paramName, String(value));
      setParams(next, { flushSync: true });
    }
  });

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
