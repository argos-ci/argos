import { describe, expect, it } from "vitest";

import { formatDate, formatDuration, formatRelativeDate } from "./date-format";

// Built from local parts so the expectations hold in any time zone.
const at = (
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
) => new Date(year, month - 1, day, hours, minutes, seconds);

describe("#formatDate", () => {
  // 2026-09-04 is a Friday.
  const date = at(2026, 9, 4, 15, 4, 5);

  it("formats each preset", () => {
    expect(formatDate(date, "monthDay")).toBe("Sep 4");
    expect(formatDate(date, "month")).toBe("Sep");
    expect(formatDate(date, "date")).toBe("Sep 4, 2026");
    expect(formatDate(date, "longDate")).toBe("September 4, 2026");
    expect(formatDate(date, "dateTime")).toBe("September 4, 2026 at 3:04 PM");
    expect(formatDate(date, "fullDateTime")).toBe(
      "Friday, September 4, 2026 at 3:04 PM",
    );
    expect(formatDate(date, "precise")).toBe("Sep 4, 2026, 15:04:05");
    expect(formatDate(date, "preciseWeekday")).toBe(
      "Fri, Sep 4, 2026, 15:04:05",
    );
  });

  it("uses a 24-hour clock for the precise presets", () => {
    const evening = at(2026, 9, 4, 21, 7, 9);
    expect(formatDate(evening, "precise")).toBe("Sep 4, 2026, 21:07:09");
    expect(formatDate(evening, "preciseWeekday")).toBe(
      "Fri, Sep 4, 2026, 21:07:09",
    );
  });

  it("honours an explicit locale", () => {
    expect(formatDate(date, "longDate", { locale: "fr-FR" })).toBe(
      "4 septembre 2026",
    );
  });

  it("returns the same result on repeated calls, exercising the cache", () => {
    expect(formatDate(date, "date")).toBe(formatDate(date, "date"));
  });
});

describe("#formatRelativeDate", () => {
  const now = at(2026, 9, 4, 12);
  const ago = (ms: number) =>
    formatRelativeDate(new Date(now.getTime() - ms), { now });
  const ahead = (ms: number) =>
    formatRelativeDate(new Date(now.getTime() + ms), { now });

  it("describes the recent past", () => {
    expect(ago(0)).toBe("now");
    expect(ago(3_000)).toBe("3 seconds ago");
    expect(ago(44_000)).toBe("44 seconds ago");
  });

  it("promotes to minutes past the seconds threshold", () => {
    expect(ago(45_000)).toBe("1 minute ago");
    expect(ago(30 * 60_000)).toBe("30 minutes ago");
  });

  it("rounds a half unit the same way in both directions", () => {
    expect(ago(90_000)).toBe("2 minutes ago");
    expect(ahead(90_000)).toBe("in 2 minutes");
  });

  it("promotes to hours past the minutes threshold", () => {
    expect(ago(45 * 60_000)).toBe("1 hour ago");
    expect(ago(5 * 3_600_000)).toBe("5 hours ago");
  });

  it("promotes to days past the hours threshold", () => {
    expect(ago(22 * 3_600_000)).toBe("yesterday");
    expect(ago(3 * 86_400_000)).toBe("3 days ago");
  });

  it("promotes to months and years", () => {
    expect(ago(26 * 86_400_000)).toBe("last month");
    expect(ago(90 * 86_400_000)).toBe("3 months ago");
    expect(ago(400 * 86_400_000)).toBe("last year");
    expect(ago(3 * 365 * 86_400_000)).toBe("3 years ago");
  });

  it("describes the future", () => {
    expect(ahead(3_000)).toBe("in 3 seconds");
    expect(ahead(5 * 3_600_000)).toBe("in 5 hours");
    expect(ahead(3 * 86_400_000)).toBe("in 3 days");
  });

  it("honours an explicit locale", () => {
    expect(
      formatRelativeDate(new Date(now.getTime() - 3 * 86_400_000), {
        now,
        locale: "fr-FR",
      }),
    ).toBe("il y a 3 jours");
  });

  it("defaults to comparing against the current time", () => {
    expect(formatRelativeDate(new Date())).toBe("now");
  });
});

describe("#formatDuration", () => {
  it("keeps one decimal below ten seconds", () => {
    expect(formatDuration(1_400)).toBe("1.4s");
    expect(formatDuration(9_990)).toBe("10s");
  });

  it("drops a trailing zero decimal", () => {
    expect(formatDuration(3_000)).toBe("3s");
  });

  it("rounds to whole seconds between ten seconds and a minute", () => {
    expect(formatDuration(10_000)).toBe("10s");
    expect(formatDuration(45_400)).toBe("45s");
    expect(formatDuration(59_400)).toBe("59s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(60_000)).toBe("1m");
    expect(formatDuration(83_000)).toBe("1m 23s");
    expect(formatDuration(150_000)).toBe("2m 30s");
  });

  it("carries a rounded-up minute instead of showing 60s", () => {
    expect(formatDuration(119_600)).toBe("2m");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3_600_000)).toBe("1h");
    expect(formatDuration(3_900_000)).toBe("1h 5m");
    expect(formatDuration(7_500_000)).toBe("2h 5m");
  });

  it("carries a rounded-up hour instead of showing 60m", () => {
    expect(formatDuration(7_198_000)).toBe("2h");
  });

  it("clamps a negative duration to zero", () => {
    expect(formatDuration(-5_000)).toBe("0s");
  });

  it("formats zero", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});
