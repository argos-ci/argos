import { describe, expect, it } from "vitest";

import { selectChangelogNews } from "./news";

const item = (date: string, title = date) => ({
  url: `https://argos-ci.com/changelog/${date}-${title}`,
  title,
  summary: `${title} summary`,
  date_published: `${date}T00:00:00.000Z`,
});

const items = [
  item("2026-08-11"),
  item("2026-09-12"),
  item("2026-09-01"),
  item("2026-07-25"),
  // Scheduled: dated after the report goes out.
  item("2026-10-30"),
];

const titles = (news: { title: string }[]) => news.map((entry) => entry.title);

describe("selectChangelogNews", () => {
  const now = new Date("2026-10-15T08:00:00.000Z");

  it("lists the latest few for a first report", () => {
    expect(titles(selectChangelogNews(items, { since: null, now }))).toEqual([
      "2026-09-12",
      "2026-09-01",
      "2026-08-11",
    ]);
  });

  it("lists what was published since the previous report", () => {
    const since = new Date("2026-08-20T08:00:00.000Z");
    expect(titles(selectChangelogNews(items, { since, now }))).toEqual([
      "2026-09-12",
      "2026-09-01",
    ]);
  });

  it("keeps an entry dated the day of the previous report", () => {
    const since = new Date("2026-09-12T08:00:00.000Z");
    expect(titles(selectChangelogNews(items, { since, now }))).toEqual([
      "2026-09-12",
    ]);
  });

  it("lists nothing when nothing shipped since the previous report", () => {
    const since = new Date("2026-09-20T08:00:00.000Z");
    expect(selectChangelogNews(items, { since, now })).toEqual([]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      item(`2026-09-${String(index + 10).padStart(2, "0")}`),
    );
    const since = new Date("2026-09-01T08:00:00.000Z");
    expect(selectChangelogNews(many, { since, now })).toHaveLength(5);
  });
});
