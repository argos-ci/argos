import { useState } from "react";
import { formatDate } from "@argos/util/date-format";
import { clsx } from "clsx";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayPicker, type ChevronProps } from "react-day-picker";

import { Dialog } from "./Dialog";
import { FieldError, FieldErrorContext } from "./FieldError";
import { DialogTrigger } from "./Overlay";
import { Popover } from "./Popover";

type DateRange = {
  from: Date;
  to: Date;
};

export type DateRangePickerProps = {
  value: DateRange;
  onChange: (value: DateRange) => void;
  /** The earliest day that can be picked. */
  minDate?: Date;
  /** The latest day that can be picked. */
  maxDate?: Date;
  /**
   * Returns the message to show under the field, or `null` when the range is
   * acceptable. Run against whatever is currently selected.
   */
  validate?: (value: DateRange) => string | null;
  "aria-label"?: string;
  className?: string;
  defaultOpen?: boolean;
};

function Chevron({ orientation, className }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return <Icon className={clsx("size-4", className)} />;
}

/**
 * How the calendar is dressed.
 *
 * react-day-picker names every part, so the range keeps the shape react-aria's
 * `RangeCalendar` drew: a tinted band across the middle, and a solid circle on
 * each end. The band is on the cell so it meets its neighbours, and the circle
 * on the button inside it.
 */
const calendarClassNames = {
  root: "relative flex flex-col gap-3",
  months: "flex flex-col",
  month: "flex flex-col gap-3",
  month_caption: "flex h-6 items-center justify-center",
  caption_label: "text-lg font-semibold",
  nav: "absolute inset-x-0 top-0 flex h-6 items-center justify-between",
  button_previous: "hover:bg-hover cursor-default rounded-full p-1",
  button_next: "hover:bg-hover cursor-default rounded-full p-1",
  month_grid: "border-separate border-spacing-x-0 border-spacing-y-1",
  weekdays: "",
  weekday: "text-low py-1 text-sm font-semibold",
  weeks: "",
  week: "",
  day: "group border-primary my-0.5 p-0 text-sm",
  day_button:
    "hover:bg-(--violet-5) flex size-8 cursor-default items-center justify-center rounded-full",
  // The two ends keep the solid disc react-aria drew, and it has to win over
  // the hover tint the day underneath it carries.
  range_start:
    "bg-(--violet-5) border-l-thin border-y-thin rounded-l-full my-[calc(var(--spacing)*0.5-0.5px)] ml-[calc(var(--spacing)*0.5-0.5px)] [&>button]:bg-primary-solid! [&>button]:text-white",
  range_middle:
    "bg-(--violet-5) border-y-thin my-[calc(var(--spacing)*0.5-0.5px)]",
  range_end:
    "bg-(--violet-5) border-r-thin border-y-thin rounded-r-full my-[calc(var(--spacing)*0.5-0.5px)] mr-[calc(var(--spacing)*0.5-0.5px)] [&>button]:bg-primary-solid! [&>button]:text-white",
  selected: "text-primary-low",
  today: "font-semibold",
  outside: "opacity-0",
  disabled: "opacity-disabled cursor-not-allowed",
  hidden: "invisible",
};

/**
 * A pair of dates, picked from a calendar.
 *
 * The range is shown rather than typed. react-aria's segmented `DateInput`s
 * had no counterpart when the calendar moved to `react-day-picker`, and a
 * read-only summary beats two half-working fields — the calendar was always
 * how this control was actually used.
 */
export function DateRangePicker(props: DateRangePickerProps) {
  const {
    value,
    onChange,
    minDate,
    maxDate,
    validate,
    className,
    defaultOpen,
    "aria-label": ariaLabel,
  } = props;
  // The day picked first, while the second is still to come. react-day-picker
  // would extend the range already on screen from a single click; react-aria's
  // calendar started a new one, and two clicks is what this control has always
  // asked for.
  const [anchor, setAnchor] = useState<Date | undefined>(undefined);
  const message = validate?.(value) ?? null;
  const selected = anchor ? { from: anchor, to: undefined } : value;
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <DialogTrigger defaultOpen={defaultOpen}>
        <button
          type="button"
          aria-label={ariaLabel}
          className={clsx(
            "bg-app group flex w-full appearance-none items-center rounded-lg border text-left",
            "hover:border-hover",
            "focus-visible:border-active focus:outline-hidden",
            "data-popup-open:border-active",
            message && "border-danger",
          )}
        >
          <span className="flex-1 px-2 py-1.5 text-sm leading-5">
            {formatDate(value.from, "date")}
            <span className="text-low px-1.5">-</span>
            {formatDate(value.to, "date")}
          </span>
          <span
            className={clsx(
              "text-low rounded-r-lg border-l px-2.5 py-2",
              "group-data-popup-open:text-default",
            )}
          >
            <CalendarIcon className="size-4" />
          </span>
        </button>
        <Popover align="start">
          <Dialog
            aria-label={ariaLabel ?? "Choose a date range"}
            className="p-3"
          >
            {({ close }) => (
              <DayPicker
                mode="range"
                required
                autoFocus
                defaultMonth={value.from}
                selected={selected}
                startMonth={minDate}
                endMonth={maxDate}
                disabled={[
                  ...(minDate ? [{ before: minDate }] : []),
                  ...(maxDate ? [{ after: maxDate }] : []),
                ]}
                onSelect={(_selected, triggerDate) => {
                  if (!anchor) {
                    setAnchor(triggerDate);
                    return;
                  }
                  // Either end can be picked first, so the pair is ordered
                  // here rather than refused.
                  const [from, to] =
                    triggerDate < anchor
                      ? [triggerDate, anchor]
                      : [anchor, triggerDate];
                  setAnchor(undefined);
                  onChange({ from, to });
                  close();
                }}
                components={{ Chevron }}
                classNames={calendarClassNames}
              />
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
      <FieldErrorContext value={message ? { message } : null}>
        <FieldError />
      </FieldErrorContext>
    </div>
  );
}
