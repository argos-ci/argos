import { describe, expect, it } from "vitest";

import {
  addDays,
  addHours,
  addMonths,
  addUnit,
  addWeeks,
  diffInCalendarDays,
  endOfDay,
  endOfWeek,
  formatISODay,
  isSameDay,
  isSameYear,
  parseISODay,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfUnit,
  startOfWeek,
} from "./date";

// Dates are built from local parts so the expectations hold in any time zone.
const at = (
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0,
) => new Date(year, month - 1, day, hours, minutes, seconds, ms);

describe("#startOfHour", () => {
  it("clears minutes, seconds and milliseconds", () => {
    expect(startOfHour(at(2026, 9, 4, 15, 4, 5, 123))).toEqual(
      at(2026, 9, 4, 15),
    );
  });

  it("does not mutate its input", () => {
    const date = at(2026, 9, 4, 15, 4, 5);
    startOfHour(date);
    expect(date).toEqual(at(2026, 9, 4, 15, 4, 5));
  });
});

describe("#startOfDay", () => {
  it("returns local midnight", () => {
    expect(startOfDay(at(2026, 9, 4, 15, 4, 5, 123))).toEqual(at(2026, 9, 4));
  });

  it("is a no-op on a date already at midnight", () => {
    expect(startOfDay(at(2026, 9, 4))).toEqual(at(2026, 9, 4));
  });
});

describe("#endOfDay", () => {
  it("returns the last millisecond of the day", () => {
    expect(endOfDay(at(2026, 9, 4, 15, 4, 5))).toEqual(
      at(2026, 9, 4, 23, 59, 59, 999),
    );
  });
});

describe("#startOfWeek", () => {
  it("snaps back to Sunday", () => {
    // 2026-09-04 is a Friday.
    expect(startOfWeek(at(2026, 9, 4, 15))).toEqual(at(2026, 8, 30));
  });

  it("is a no-op on a Sunday", () => {
    expect(startOfWeek(at(2026, 8, 30, 15))).toEqual(at(2026, 8, 30));
  });

  it("crosses a month boundary", () => {
    // 2026-10-01 is a Thursday, so its week starts in September.
    expect(startOfWeek(at(2026, 10, 1))).toEqual(at(2026, 9, 27));
  });
});

describe("#endOfWeek", () => {
  it("returns the last millisecond of the following Saturday", () => {
    expect(endOfWeek(at(2026, 9, 4))).toEqual(at(2026, 9, 5, 23, 59, 59, 999));
  });
});

describe("#startOfMonth", () => {
  it("returns midnight on the first", () => {
    expect(startOfMonth(at(2026, 9, 4, 15))).toEqual(at(2026, 9, 1));
  });
});

describe("#addHours", () => {
  it("shifts forward", () => {
    expect(addHours(at(2026, 9, 4, 10), 5)).toEqual(at(2026, 9, 4, 15));
  });

  it("shifts backward and crosses the day boundary", () => {
    expect(addHours(at(2026, 9, 4, 10), -24)).toEqual(at(2026, 9, 3, 10));
  });
});

describe("#addDays", () => {
  it("shifts forward across a month boundary", () => {
    expect(addDays(at(2026, 8, 30), 5)).toEqual(at(2026, 9, 4));
  });

  it("shifts backward across a year boundary", () => {
    expect(addDays(at(2026, 1, 2), -5)).toEqual(at(2025, 12, 28));
  });

  it("keeps the wall-clock time", () => {
    expect(addDays(at(2026, 9, 4, 15, 30), 1)).toEqual(at(2026, 9, 5, 15, 30));
  });
});

describe("#addWeeks", () => {
  it("shifts by seven days per week", () => {
    expect(addWeeks(at(2026, 9, 4), 2)).toEqual(at(2026, 9, 18));
  });
});

describe("#addMonths", () => {
  it("shifts forward keeping the day of the month", () => {
    expect(addMonths(at(2026, 9, 4), 2)).toEqual(at(2026, 11, 4));
  });

  it("shifts backward across a year boundary", () => {
    expect(addMonths(at(2026, 1, 15), -2)).toEqual(at(2025, 11, 15));
  });

  it("clamps to the last day when the target month is shorter", () => {
    expect(addMonths(at(2026, 1, 31), 1)).toEqual(at(2026, 2, 28));
  });

  it("clamps to February 29 in a leap year", () => {
    expect(addMonths(at(2028, 1, 31), 1)).toEqual(at(2028, 2, 29));
  });

  it("preserves the time of day while clamping", () => {
    expect(addMonths(at(2026, 3, 31, 14, 30), -1)).toEqual(
      at(2026, 2, 28, 14, 30),
    );
  });
});

describe("#startOfUnit", () => {
  it("dispatches on the unit", () => {
    const date = at(2026, 9, 4, 15, 4, 5);
    expect(startOfUnit(date, "hour")).toEqual(at(2026, 9, 4, 15));
    expect(startOfUnit(date, "day")).toEqual(at(2026, 9, 4));
    expect(startOfUnit(date, "week")).toEqual(at(2026, 8, 30));
    expect(startOfUnit(date, "month")).toEqual(at(2026, 9, 1));
  });
});

describe("#addUnit", () => {
  it("dispatches on the unit", () => {
    const date = at(2026, 9, 4);
    expect(addUnit(date, 2, "hour")).toEqual(at(2026, 9, 4, 2));
    expect(addUnit(date, 2, "day")).toEqual(at(2026, 9, 6));
    expect(addUnit(date, 2, "week")).toEqual(at(2026, 9, 18));
    expect(addUnit(date, 2, "month")).toEqual(at(2026, 11, 4));
  });
});

describe("#diffInCalendarDays", () => {
  it("counts whole days between midnights", () => {
    expect(diffInCalendarDays(at(2026, 9, 4), at(2026, 9, 1))).toBe(3);
  });

  it("ignores the time of day", () => {
    expect(diffInCalendarDays(at(2026, 9, 4, 1), at(2026, 9, 1, 23))).toBe(3);
  });

  it("returns zero on the same day", () => {
    expect(diffInCalendarDays(at(2026, 9, 4, 23), at(2026, 9, 4, 1))).toBe(0);
  });

  it("is negative when the left side is earlier", () => {
    expect(diffInCalendarDays(at(2026, 9, 1), at(2026, 9, 4))).toBe(-3);
  });

  it("counts whole days across a DST transition", () => {
    // Spans the US spring-forward date, a 23-hour day where a millisecond
    // division would land on 29.96 and truncate to 29.
    expect(diffInCalendarDays(at(2026, 3, 25), at(2026, 2, 23))).toBe(30);
  });
});

describe("#isSameYear", () => {
  it("is true within a year", () => {
    expect(isSameYear(at(2026, 1, 1), at(2026, 12, 31))).toBe(true);
  });

  it("is false across years", () => {
    expect(isSameYear(at(2026, 12, 31), at(2027, 1, 1))).toBe(false);
  });
});

describe("#isSameDay", () => {
  it("ignores the time of day", () => {
    expect(isSameDay(at(2026, 9, 4, 0, 0, 1), at(2026, 9, 4, 23, 59))).toBe(
      true,
    );
  });

  it("is false one millisecond across midnight", () => {
    expect(isSameDay(at(2026, 9, 4, 23, 59, 59), at(2026, 9, 5, 0, 0, 0))).toBe(
      false,
    );
  });
});

describe("#parseISODay", () => {
  it("parses a valid day to local midnight", () => {
    expect(parseISODay("2026-09-04")).toEqual(at(2026, 9, 4));
  });

  it("parses February 29 in a leap year", () => {
    expect(parseISODay("2028-02-29")).toEqual(at(2028, 2, 29));
  });

  it("rejects a day the month does not have", () => {
    expect(parseISODay("2026-02-31")).toBeNull();
    expect(parseISODay("2026-02-29")).toBeNull();
  });

  it("rejects an out-of-range month", () => {
    expect(parseISODay("2026-13-01")).toBeNull();
    expect(parseISODay("2026-00-01")).toBeNull();
  });

  it("rejects unpadded and malformed input", () => {
    expect(parseISODay("2026-9-4")).toBeNull();
    expect(parseISODay("2026/09/04")).toBeNull();
    expect(parseISODay("")).toBeNull();
    expect(parseISODay("not-a-date")).toBeNull();
  });

  it("rejects a datetime string", () => {
    expect(parseISODay("2026-09-04T15:04:05Z")).toBeNull();
  });

  it("rejects years below 100 rather than remapping them", () => {
    expect(parseISODay("0050-01-01")).toBeNull();
  });
});

describe("#formatISODay", () => {
  it("formats the local calendar day", () => {
    expect(formatISODay(at(2026, 9, 4, 15, 4, 5))).toBe("2026-09-04");
  });

  it("pads month and day", () => {
    expect(formatISODay(at(2026, 1, 2))).toBe("2026-01-02");
  });

  it("round-trips with parseISODay", () => {
    expect(formatISODay(parseISODay("2026-09-04")!)).toBe("2026-09-04");
  });

  it("uses the local day even late in the evening", () => {
    expect(formatISODay(at(2026, 9, 4, 23, 59, 59))).toBe("2026-09-04");
  });
});
