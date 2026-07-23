import { ComponentPropsWithRef } from "react";
import NumberFlow from "@number-flow/react";
import { clsx } from "clsx";

import { Card } from "./Card";

type StatTileColor = "primary" | "storybook" | "warning" | "success";

const StatTileChipStyles: Record<StatTileColor, string> = {
  primary: "bg-primary-ui text-primary-low",
  storybook: "bg-storybook-ui text-storybook-low",
  warning: "bg-warning-ui text-warning-low",
  success: "bg-success-ui text-success-low",
};

type StatTileProps = ComponentPropsWithRef<"div"> & {
  icon: React.ComponentType<{ className?: string }>;
  color: StatTileColor;
  label: string;
  value: number | null | undefined;
  format?: "number" | "percent";
  hint?: React.ReactNode;
  visual?: React.ReactNode;
};

/**
 * A single KPI in a summary band: an icon, a headline value, a supporting
 * line, and an optional inline visual (sparkline or split bar).
 *
 * `value` is `undefined` while loading (skeleton), `null` when there is no
 * meaningful figure to show (rendered as an em dash), otherwise the number.
 */
export function StatTile({
  icon: Icon,
  color,
  label,
  value,
  format = "number",
  hint,
  visual,
  ...rest
}: StatTileProps) {
  const isLoading = value === undefined;
  return (
    <Card {...rest} className={clsx("flex flex-col gap-4 p-5", rest.className)}>
      <div className="flex items-center gap-2.5">
        <div
          className={clsx(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            StatTileChipStyles[color],
          )}
        >
          <Icon className="size-4" />
        </div>
        <span className="text-low text-sm font-medium">{label}</span>
      </div>
      <div>
        <div className="relative text-3xl leading-none font-black tabular-nums">
          {value === undefined ? (
            <div className="bg-subtle h-[1em] w-24 rounded-sm" />
          ) : value === null ? (
            <span className="text-low">—</span>
          ) : format === "percent" ? (
            <NumberFlow
              value={value}
              format={{ style: "percent", maximumFractionDigits: 0 }}
            />
          ) : (
            <NumberFlow value={value} />
          )}
        </div>
        {hint ? (
          <p className="text-low mt-0.5 h-4 text-sm">
            {isLoading ? null : hint}
          </p>
        ) : null}
      </div>
      {visual ? <div className="mt-auto">{visual}</div> : null}
    </Card>
  );
}
