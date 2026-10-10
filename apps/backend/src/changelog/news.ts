import { z } from "zod";

import type { MonthlyReportNewsItem } from "@/email/templates/monthly_report";

/** Served by argos-ci.com, built from the same files as its changelog page. */
const FEED_URL = "https://argos-ci.com/changelog.json";

/** The feed changes a few times a month: one read an hour is plenty. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Entries a report lists at most, the latest first. Also what a first report
 * lists, having no previous one to start from.
 */
const MAX_COUNT = 3;

const FeedItemSchema = z.object({
  url: z.url(),
  title: z.string(),
  summary: z.string(),
  date_published: z.string(),
});

const FeedSchema = z.object({ items: z.array(FeedItemSchema) });

type FeedItem = z.infer<typeof FeedItemSchema>;

let cache: { fetchedAt: number; items: FeedItem[] } | null = null;

async function fetchFeedItems(): Promise<FeedItem[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items;
  }
  const response = await fetch(FEED_URL, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`The changelog feed answered ${response.status}`);
  }
  const feed = FeedSchema.parse(await response.json());
  cache = { fetchedAt: Date.now(), items: feed.items };
  return feed.items;
}

/**
 * The entries a report lists, newest first: the ones published since the
 * previous report, or the latest when there was none, three at most.
 *
 * Entries are dated by the day, and the previous report went out at some hour
 * of it, so the comparison is on the day: an entry dated the day of the
 * previous report may show twice rather than not at all.
 */
export function selectChangelogNews(
  items: FeedItem[],
  input: { since: Date | null; now: Date },
): MonthlyReportNewsItem[] {
  const published = items
    .filter((item) => new Date(item.date_published) <= input.now)
    .sort((a, b) => b.date_published.localeCompare(a.date_published));
  const { since } = input;
  const selected = since
    ? published.filter(
        (item) =>
          item.date_published.slice(0, 10) >= since.toISOString().slice(0, 10),
      )
    : published;
  return selected.slice(0, MAX_COUNT).map((item) => ({
    title: item.title,
    summary: item.summary,
    url: item.url,
    publishedAt: item.date_published,
  }));
}

/**
 * What shipped in Argos since the previous report. Throws when the changelog
 * cannot be read: the report then waits for the next run, since sending it
 * without its news would skip them for good.
 */
export async function getChangelogNews(input: {
  since: Date | null;
  now: Date;
}): Promise<MonthlyReportNewsItem[]> {
  return selectChangelogNews(await fetchFeedItems(), input);
}
