/**
 * Calendar arithmetic on native `Date`, in the runtime's local time zone.
 *
 * Hours are absolute durations (a fixed number of milliseconds) while days,
 * weeks and months are calendar units that preserve the wall-clock time across
 * DST transitions.
 */

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** Units we snap to and step by, mostly to lay out chart axes. */
export type TimeUnit = "hour" | "day" | "week" | "month";

/**
 * Day a week starts on, `0` being Sunday. Sunday keeps weeks aligned with the
 * `en-US` calendar, which is what we display.
 */
const WEEK_STARTS_ON = 0;

export function startOfHour(date: Date): Date {
  const result = new Date(date);
  result.setMinutes(0, 0, 0);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const offset = (result.getDay() - WEEK_STARTS_ON + 7) % 7;
  result.setDate(result.getDate() - offset);
  return result;
}

export function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return endOfDay(result);
}

export function startOfMonth(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(1);
  return result;
}

/**
 * Add an absolute number of hours. Unlike the calendar helpers this shifts the
 * instant by exactly `amount * 3600s`, so the wall-clock hour may differ by one
 * across a DST boundary.
 */
export function addHours(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * MS_PER_HOUR);
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * 7);
}

/**
 * Add months, clamping to the last day of the target month so that a day number
 * the target month does not have cannot spill into the following one — Jan 31
 * plus one month is Feb 28, not Mar 3.
 */
export function addMonths(date: Date, amount: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  result.setDate(Math.min(day, getDaysInMonth(result)));
  return result;
}

/** Number of days in the month `date` falls in. */
function getDaysInMonth(date: Date): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Snap `date` down to the start of the given unit. */
export function startOfUnit(date: Date, unit: TimeUnit): Date {
  switch (unit) {
    case "hour":
      return startOfHour(date);
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date);
    case "month":
      return startOfMonth(date);
  }
}

/** Add `amount` of the given unit to `date`. */
export function addUnit(date: Date, amount: number, unit: TimeUnit): Date {
  switch (unit) {
    case "hour":
      return addHours(date, amount);
    case "day":
      return addDays(date, amount);
    case "week":
      return addWeeks(date, amount);
    case "month":
      return addMonths(date, amount);
  }
}

/**
 * Whole calendar days from `right` to `left`, counting date boundaries crossed
 * rather than elapsed milliseconds. A span crossing a DST change still counts
 * as a whole number of days.
 */
export function diffInCalendarDays(left: Date, right: Date): number {
  const elapsed = startOfDay(left).getTime() - startOfDay(right).getTime();
  return Math.round(elapsed / MS_PER_DAY);
}

export function isSameYear(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear();
}

/** Whether both dates fall on the same local calendar day. */
export function isSameDay(left: Date, right: Date): boolean {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a `YYYY-MM-DD` string into local midnight, strictly: anything that is
 * not exactly that shape, or that names a day the month does not have, gives
 * `null` rather than a shifted date.
 */
export function parseISODay(value: string): Date | null {
  const match = ISO_DAY_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // Reject overflow ("2026-02-31" would roll into March) and the two-digit year
  // remapping `Date` applies below year 100.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Format `date` as `YYYY-MM-DD`, using its local calendar day. */
export function formatISODay(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
