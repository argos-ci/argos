import { parseDate } from "@internationalized/date";
import { clsx } from "clsx";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  DateRangePicker as AriaDateRangePicker,
  Button,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DateSegment,
  Dialog,
  Group,
  Heading,
  RangeCalendar,
  type DateRangePickerProps as AriaDateRangePickerProps,
  type DateValue,
} from "react-aria-components";

import { FieldError } from "./FieldError";
import { Popover } from "./Popover";

type DateRange = {
  from: Date;
  to: Date;
};

export interface DateRangePickerProps extends Omit<
  AriaDateRangePickerProps<DateValue>,
  "value" | "onChange" | "defaultValue" | "children"
> {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function DateRangePicker({
  value,
  onChange,
  ...props
}: DateRangePickerProps) {
  return (
    <AriaDateRangePicker
      {...props}
      value={{
        start: parseDate(formatDateValue(value.from)),
        end: parseDate(formatDateValue(value.to)),
      }}
      onChange={(nextValue) => {
        if (!nextValue) {
          return;
        }
        onChange({
          from: parseDateValue(String(nextValue.start)),
          to: parseDateValue(String(nextValue.end)),
        });
      }}
      className={clsx(
        "group/date-range-picker flex flex-col gap-2",
        props.className,
      )}
    >
      <Group
        className={clsx(
          "bg-app flex w-full appearance-none items-center rounded border",
          "data-focus-within:border-active data-focus-within:data-hovered:border-active",
          "group-data-open/date-range-picker:border-active",
          "data-hovered:border-hover",
          "data-invalid:border-danger",
          "data-disabled:opacity-disabled",
        )}
      >
        <DateInput
          slot="start"
          className="data-placeholder:text-low px-1 py-1.5 pl-2 text-sm leading-5"
        >
          {(segment) => (
            <DateSegment
              segment={segment}
              className="data-focused:bg-hover rounded-xs px-px outline-hidden"
            />
          )}
        </DateInput>
        <span className="text-low px-0.5">-</span>
        <DateInput
          slot="end"
          className="data-placeholder:text-low px-1 py-1.5 pr-2 text-sm leading-5"
        >
          {(segment) => (
            <DateSegment
              segment={segment}
              className="data-focused:bg-hover rounded-xs px-px outline-hidden"
            />
          )}
        </DateInput>
        <Button
          className={clsx(
            "rounded-r border-l px-2.5 py-2",
            "data-hovered:bg-hover",
            "data-pressed:bg-active",
            "outline-hidden",
            "group-data-open/date-range-picker:text-default text-low",
          )}
        >
          <CalendarIcon className="size-4" />
        </Button>
      </Group>
      <FieldError />
      <Popover>
        <Dialog className="p-3">
          <RangeCalendar className="flex flex-col gap-3">
            <header className="flex items-center justify-between">
              <Button
                slot="previous"
                className="hover:bg-hover rounded-full p-1"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Heading className="text-lg font-semibold" />
              <Button slot="next" className="hover:bg-hover rounded-full p-1">
                <ChevronRightIcon className="size-4" />
              </Button>
            </header>
            <CalendarGrid className="border-separate border-spacing-x-0 border-spacing-y-1">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="text-low py-1 text-sm font-semibold">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className={clsx(
                      "group border-primary my-0.5 flex cursor-default items-center justify-center px-0.5 text-sm",
                      "data-selected:text-primary-low data-selected:bg-(--violet-5)",
                      "data-selected:data-selection-start:rounded-l-full data-selected:data-selection-start:border-l-[0.5px]",
                      "data-selected:data-selection-end:rounded-r-full data-selected:data-selection-end:border-r-[0.5px]",
                      "data-selected:my-[calc(var(--spacing)*0.5-0.5px)] data-selected:border-y-[0.5px]",
                      "data-selection-end:mr-[calc(var(--spacing)*0.5-0.5px)] data-selection-end:pr-0",
                      "data-selection-start:ml-[calc(var(--spacing)*0.5-0.5px)] data-selection-start:pl-0",
                    )}
                  >
                    {(renderProps) => (
                      <div
                        className={clsx(
                          "flex size-8 items-center justify-center",
                          renderProps.isSelectionEnd ||
                            renderProps.isSelectionStart
                            ? "bg-primary-solid group-invalid:bg-danger-solid rounded-full text-white"
                            : null,
                        )}
                      >
                        {renderProps.defaultChildren}
                      </div>
                    )}
                  </CalendarCell>
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </RangeCalendar>
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  );
}
