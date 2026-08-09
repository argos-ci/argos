/**
 * Date formatting built on the `Intl` APIs.
 *
 * Formats are named presets rather than token strings: `Intl` composes its
 * output from an option bag, so the field order and separators come from the
 * locale instead of being spelled out at the call site.
 */

/**
 * Locale used when a caller does not pass one. Pinned so that output stays
 * identical between the browser and the server, where the ambient locale
 * depends on how the process was started.
 */
const DEFAULT_LOCALE = "en-US";

export type DateFormat =
  /** `Sep 4` */
  | "monthDay"
  /** `Sep` */
  | "month"
  /** `Sep 4, 2026` */
  | "date"
  /** `September 4, 2026` */
  | "longDate"
  /** `September 4, 2026 at 3:04 PM` */
  | "dateTime"
  /** `Friday, September 4, 2026 at 3:04 PM` */
  | "fullDateTime"
  /** `Sep 4, 2026, 15:04:05` */
  | "precise"
  /** `Fri, Sep 4, 2026, 15:04:05` */
  | "preciseWeekday";

const DATE_FORMAT_OPTIONS: Record<DateFormat, Intl.DateTimeFormatOptions> = {
  monthDay: { month: "short", day: "numeric" },
  month: { month: "short" },
  date: { dateStyle: "medium" },
  longDate: { dateStyle: "long" },
  dateTime: { dateStyle: "long", timeStyle: "short" },
  fullDateTime: { dateStyle: "full", timeStyle: "short" },
  precise: { dateStyle: "medium", timeStyle: "medium", hourCycle: "h23" },
  preciseWeekday: {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  },
};

type FormatOptions = {
  /** BCP 47 locale tag. Defaults to `en-US`. */
  locale?: string;
};

// `Intl` formatters are expensive to construct and cheap to reuse, and callers
// re-render on a timer, so keep one per locale/format pair.
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(format: DateFormat, locale: string) {
  const key = `${locale}|${format}`;
  const cached = dateTimeFormatters.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(
    locale,
    DATE_FORMAT_OPTIONS[format],
  );
  dateTimeFormatters.set(key, formatter);
  return formatter;
}

/** Format an absolute date using one of the named presets. */
export function formatDate(
  date: Date,
  format: DateFormat,
  options?: FormatOptions,
): string {
  const locale = options?.locale ?? DEFAULT_LOCALE;
  return getDateTimeFormatter(format, locale).format(date);
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_MONTH = 30 * MS_PER_DAY;
const MS_PER_YEAR = 365 * MS_PER_DAY;

/**
 * Unit cascade for relative phrasing: the first entry whose `max` the elapsed
 * time is under wins, so 90 seconds reads as "2 minutes ago" rather than
 * "90 seconds ago".
 */
const RELATIVE_UNITS: readonly {
  unit: Intl.RelativeTimeFormatUnit;
  ms: number;
  max: number;
}[] = [
  { unit: "second", ms: MS_PER_SECOND, max: 45 * MS_PER_SECOND },
  { unit: "minute", ms: MS_PER_MINUTE, max: 45 * MS_PER_MINUTE },
  { unit: "hour", ms: MS_PER_HOUR, max: 22 * MS_PER_HOUR },
  { unit: "day", ms: MS_PER_DAY, max: 26 * MS_PER_DAY },
  { unit: "month", ms: MS_PER_MONTH, max: 11 * MS_PER_MONTH },
  { unit: "year", ms: MS_PER_YEAR, max: Number.POSITIVE_INFINITY },
];

type VaguePhrasing = { past: string; future: string };

/**
 * Wording that stands in for a count. `Intl.RelativeTimeFormat` always emits
 * one, and a count of seconds changes every second — enough to reflow whatever
 * sits next to it. The whole seconds bucket therefore reads as one steady
 * phrase, and a lone minute or hour matches that register. Bigger units already
 * get idiomatic wording from `numeric: "auto"` ("yesterday", "last month").
 *
 * Keyed by language, since the phrases are not something `Intl` can derive.
 * Languages missing from the table keep the numeric wording.
 */
const VAGUE_PHRASINGS: Record<
  string,
  Partial<Record<Intl.RelativeTimeFormatUnit, VaguePhrasing>>
> = {
  en: {
    second: { past: "a few seconds ago", future: "in a few seconds" },
    minute: { past: "a minute ago", future: "in a minute" },
    hour: { past: "an hour ago", future: "in an hour" },
  },
};

/**
 * Vague wording for `value` `unit`s, or `null` when the count should be shown.
 * Everything below a minute is vague; past that, only a lone unit is, so
 * "5 minutes ago" keeps its number.
 */
function getVaguePhrasing(
  locale: string,
  unit: Intl.RelativeTimeFormatUnit,
  value: number,
): VaguePhrasing | null {
  if (unit !== "second" && Math.abs(value) !== 1) {
    return null;
  }
  return VAGUE_PHRASINGS[new Intl.Locale(locale).language]?.[unit] ?? null;
}

const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();

function getRelativeTimeFormatter(locale: string) {
  const cached = relativeTimeFormatters.get(locale);
  if (cached) {
    return cached;
  }
  // "auto" lets the locale use idiomatic wording where it has some, so a day
  // back reads as "yesterday" instead of "1 day ago".
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  relativeTimeFormatters.set(locale, formatter);
  return formatter;
}

/**
 * Describe `date` relative to now — "a few seconds ago", "3 minutes ago",
 * "yesterday", "in 2 months".
 */
export function formatRelativeDate(
  date: Date,
  options?: FormatOptions & {
    /** Instant to compare against. Defaults to now. */
    now?: Date;
  },
): string {
  const now = options?.now ?? new Date();
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const elapsed = date.getTime() - now.getTime();
  const magnitude = Math.abs(elapsed);
  const formatter = getRelativeTimeFormatter(locale);
  for (const { unit, ms, max } of RELATIVE_UNITS) {
    if (magnitude < max) {
      // Round the magnitude and reapply the sign rather than rounding a signed
      // value: `Math.round` breaks ties towards +Infinity, which would make a
      // 90-second gap read as "1 minute ago" but "in 2 minutes".
      const value = Math.round(magnitude / ms) * Math.sign(elapsed);
      const vague = getVaguePhrasing(locale, unit, value);
      if (vague) {
        return elapsed > 0 ? vague.future : vague.past;
      }
      return formatter.format(value, unit);
    }
  }
  // The cascade ends at an unbounded entry, so this is unreachable.
  return formatter.format(Math.round(elapsed / MS_PER_YEAR), "year");
}

/**
 * Format an elapsed duration in milliseconds as a compact, precise string —
 * `1.4s`, `45s`, `2m 30s`, `1h 5m`. Sub-minute durations keep one decimal below
 * ten seconds so that short builds do not all collapse to the same value.
 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, ms);
  if (total < 10 * MS_PER_SECOND) {
    const seconds = total / MS_PER_SECOND;
    // Drop a trailing ".0" so whole seconds read as "3s", not "3.0s".
    return `${Number(seconds.toFixed(1))}s`;
  }
  if (total < MS_PER_MINUTE) {
    return `${Math.round(total / MS_PER_SECOND)}s`;
  }
  if (total < MS_PER_HOUR) {
    const minutes = Math.floor(total / MS_PER_MINUTE);
    const seconds = Math.round((total % MS_PER_MINUTE) / MS_PER_SECOND);
    // Rounding can land on a full minute; carry it instead of showing "60s".
    return seconds === 60 || seconds === 0
      ? `${seconds === 60 ? minutes + 1 : minutes}m`
      : `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(total / MS_PER_HOUR);
  const minutes = Math.round((total % MS_PER_HOUR) / MS_PER_MINUTE);
  return minutes === 60 || minutes === 0
    ? `${minutes === 60 ? hours + 1 : hours}h`
    : `${hours}h ${minutes}m`;
}
