import { useNumberFormatter } from "react-aria";

import { FlakinessCircleIndicator } from "@/containers/Test/FlakinessCircleIndicator";
import { Tooltip } from "@/ui/Tooltip";

import {
  Counter,
  CounterLabel,
  CounterValue,
  CounterValueUnit,
} from "./Counter";

export function FlakinessTooltip() {
  return (
    <>
      Indicates how flaky this test is by analyzing its stability and its
      consistency.
    </>
  );
}

export function FlakinessGauge(props: { value: number }) {
  return (
    <Counter>
      <Tooltip content={<FlakinessTooltip />}>
        <CounterLabel>Flakiness</CounterLabel>
      </Tooltip>
      <FlakinessCircleIndicator value={props.value} className="size-17.5" />
    </Counter>
  );
}

export function BuildsTooltip(props: { periodLabel: string }) {
  return (
    <>
      The total number of <strong>auto-approved builds</strong> this test has
      been part of over the <strong>{props.periodLabel}</strong>.
    </>
  );
}

export function BuildsCounter(props: { value: number; periodLabel: string }) {
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  return (
    <Counter>
      <Tooltip content={<BuildsTooltip periodLabel={props.periodLabel} />}>
        <CounterLabel>Builds</CounterLabel>
      </Tooltip>
      <CounterValue>{compactFormatter.format(props.value)}</CounterValue>
    </Counter>
  );
}

export function ChangesTooltip(props: { periodLabel: string }) {
  return (
    <>
      The number of changes detected in this test over the{" "}
      <strong>{props.periodLabel}</strong>.
    </>
  );
}

export function ChangesCounter(props: { value: number; periodLabel: string }) {
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  return (
    <Counter>
      <Tooltip content={<ChangesTooltip periodLabel={props.periodLabel} />}>
        <CounterLabel>Changes</CounterLabel>
      </Tooltip>
      <CounterValue>{compactFormatter.format(props.value)}</CounterValue>
    </Counter>
  );
}

export function StabilityTooltip() {
  return (
    <>
      Indicates how stable this test is by comparing the number of changes to
      the total number of reference builds. A{" "}
      <strong>lower stability rate</strong> means the test is more likely to be{" "}
      <strong>flaky</strong>.
    </>
  );
}

export function StabilityCounter(props: { value: number }) {
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  return (
    <Counter>
      <Tooltip content={<StabilityTooltip />}>
        <CounterLabel>Stability</CounterLabel>
      </Tooltip>
      <CounterValue>
        {compactFormatter.format(props.value * 100)}
        <CounterValueUnit>%</CounterValueUnit>
      </CounterValue>
    </Counter>
  );
}

export function ConsistencyTooltip() {
  return (
    <>
      Indicates how consistent is this test by comparing the number of one-off
      changes to the total number of changes. A{" "}
      <strong>lower consistency rate</strong> means the test is more likely to
      be <strong>flaky</strong>.
    </>
  );
}

export function ConsistencyCounter(props: { value: number }) {
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  return (
    <Counter>
      <Tooltip content={<ConsistencyTooltip />}>
        <CounterLabel>Consistency</CounterLabel>
      </Tooltip>
      <CounterValue>
        {compactFormatter.format(props.value * 100)}
        <CounterValueUnit>%</CounterValueUnit>
      </CounterValue>
    </Counter>
  );
}
