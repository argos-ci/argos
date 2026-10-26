import { ComponentPropsWithRef, createContext, use } from "react";
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
  /** `currency` renders money, US dollars unless `currency` says otherwise. */
  format?: "number" | "percent" | "currency";
  /** ISO code for `format="currency"` — the staff pages price in USD, the revenue page in EUR. */
  currency?: string;
  /**
   * Locale the figure is written in. Left out, it follows the reader's own —
   * which is what a page shown to customers wants, and what a page pinned to
   * one locale has to override so it reads the same on every screen.
   */
  locales?: Intl.LocalesArgument;
  hint?: React.ReactNode;
  visual?: React.ReactNode;
};

/**
 * Set by `StatTileGroup`: the tiles inside one read as rows of a single card
 * on a phone, where the others stay cards of their own.
 */
const StatTileGroupContext = createContext(false);

/**
 * The band a page lays its tiles out in, a grid whose columns the page sets.
 *
 * On a phone the band is one card and each tile a row of it: a grid of cards
 * stacked two by two took half the screen before the content it summarizes,
 * and a row says the same thing in a line. Meant for tiles that carry a figure
 * and a line under it; a tile with a chart under its figure reads better as a
 * card, so a band of those is laid out by the page itself.
 */
export function StatTileGroup(props: ComponentPropsWithRef<"div">) {
  return (
    <StatTileGroupContext value>
      <div
        {...props}
        className={clsx(
          "grid gap-4",
          "max-sm:border-thin max-sm:border-default max-sm:bg-app max-sm:flex max-sm:flex-col max-sm:gap-0 max-sm:overflow-hidden max-sm:rounded-xl max-sm:shadow-xs",
          props.className,
        )}
      />
    </StatTileGroupContext>
  );
}

/**
 * How each part of a tile changes on a phone, as a row of a `StatTileGroup` or
 * as a card of its own.
 *
 * As a row, the two wrappers dissolve into the row's grid, so the parts can be
 * placed without rendering any of them twice: the icon, the label with the
 * supporting line under it, then the value at the far end. The supporting line
 * goes under the label rather than beside it: some run long, and beside a long
 * label they wrapped into a column a few words wide.
 *
 * As a card, the tile keeps its desktop shape with tighter spacing.
 */
const PHONE_CLASS_NAMES = {
  row: {
    card: "max-sm:border-b-thin max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-x-2.5 max-sm:gap-y-0 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:px-3 max-sm:py-2 max-sm:shadow-none max-sm:last:border-b-0",
    header: "max-sm:contents",
    icon: "max-sm:col-start-1 max-sm:row-span-2 max-sm:row-start-1",
    label: "max-sm:text-default max-sm:col-start-2 max-sm:row-start-1",
    body: "max-sm:contents",
    value:
      "max-sm:col-start-3 max-sm:row-span-2 max-sm:row-start-1 max-sm:text-lg",
    hint: "max-sm:col-start-2 max-sm:row-start-2 max-sm:mt-0 max-sm:min-h-0",
    visual: "max-sm:col-span-full max-sm:mt-2",
  },
  card: {
    card: "max-sm:gap-2.5 max-sm:p-3.5",
    header: "max-sm:gap-2",
    icon: "",
    label: "",
    body: "",
    value: "max-sm:text-2xl",
    hint: "max-sm:min-h-4",
    visual: "",
  },
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
  currency = "USD",
  locales,
  hint,
  visual,
  ...rest
}: StatTileProps) {
  const isLoading = value === undefined;
  const phone = PHONE_CLASS_NAMES[use(StatTileGroupContext) ? "row" : "card"];
  return (
    <Card
      {...rest}
      className={clsx("flex flex-col gap-4 p-5", phone.card, rest.className)}
    >
      <div className={clsx("flex items-center gap-2.5", phone.header)}>
        <div
          className={clsx(
            "flex size-7 shrink-0 items-center justify-center rounded-md max-sm:size-6",
            StatTileChipStyles[color],
            phone.icon,
          )}
        >
          <Icon className="size-4 max-sm:size-3.5" />
        </div>
        <span className={clsx("text-low text-sm font-medium", phone.label)}>
          {label}
        </span>
      </div>
      <div className={phone.body}>
        <div
          className={clsx(
            "relative text-3xl leading-none font-black tabular-nums",
            phone.value,
          )}
        >
          {value === undefined ? (
            <div className="bg-subtle h-[1em] w-24 rounded-sm" />
          ) : value === null ? (
            <span className="text-low">—</span>
          ) : format === "percent" ? (
            <NumberFlow
              value={value}
              locales={locales}
              format={{ style: "percent", maximumFractionDigits: 0 }}
            />
          ) : format === "currency" ? (
            <NumberFlow
              value={value}
              locales={locales}
              format={{
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }}
            />
          ) : (
            <NumberFlow value={value} locales={locales} />
          )}
        </div>
        {hint ? (
          // A floor rather than a height: the line is reserved while the
          // figures load, so the card does not grow under the reader when they
          // land — but a hint that wraps at a narrow width has to take the
          // room it needs instead of spilling out of the card's padding.
          <p
            className={clsx(
              "text-low mt-0.5 min-h-5 text-sm max-sm:text-xs",
              phone.hint,
            )}
          >
            {isLoading ? null : hint}
          </p>
        ) : null}
      </div>
      {visual ? (
        <div className={clsx("mt-auto", phone.visual)}>{visual}</div>
      ) : null}
    </Card>
  );
}
