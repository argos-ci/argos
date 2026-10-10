import { z } from "zod";

import logger from "@/logger";

/** Served by argos-ci.com, built from the same files as its changelog page. */
const FEED_URL = "https://argos-ci.com/changelog.json";

/** The feed changes a few times a month: one read an hour is plenty. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** A first report has no previous one to start from: the latest few will do. */
const FIRST_REPORT_COUNT = 3;

const MAX_COUNT = 5;

const FeedItemSchema = z.object({
  url: z.url(),
  title: z.string(),
  summary: z.string(),
  date_published: z.string(),
});

const FeedSchema = z.object({ items: z.array(FeedItemSchema) });

type FeedItem = z.infer<typeof FeedItemSchema>;

export type ChangelogNewsItem = {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
};

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
 * previous report, or the latest few when there was none.
 *
 * Entries are dated by the day, and the previous report went out at some hour
 * of it, so the comparison is on the day: an entry dated the day of the
 * previous report may show twice, but none is ever skipped.
 */
export function selectChangelogNews(
  items: FeedItem[],
  input: { since: Date | null; now: Date },
): ChangelogNewsItem[] {
  const published = items
    .filter((item) => new Date(item.date_published) <= input.now)
    .sort((a, b) => b.date_published.localeCompare(a.date_published));
  const { since } = input;
  const selected = since
    ? published.filter(
        (item) =>
          item.date_published.slice(0, 10) >= since.toISOString().slice(0, 10),
      )
    : published.slice(0, FIRST_REPORT_COUNT);
  return selected.slice(0, MAX_COUNT).map((item) => ({
    title: item.title,
    summary: item.summary,
    url: item.url,
    publishedAt: item.date_published,
  }));
}

/**
 * What shipped in Argos since the previous report. Empty when the changelog
 * cannot be read: news never hold a report back.
 */
export async function getChangelogNews(input: {
  since: Date | null;
  now: Date;
}): Promise<ChangelogNewsItem[]> {
  try {
    return selectChangelogNews(await fetchFeedItems(), input);
  } catch (error) {
    logger.warn({ error }, "Could not read the Argos changelog feed");
    return [];
  }
}
