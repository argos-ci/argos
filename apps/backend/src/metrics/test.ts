import { invariant } from "@argos/util/invariant";

import { knex } from "@/database";

/**
 * Get the changes metrics for a test.
 */
export async function getTestAllMetrics(input: {
  testId: string;
  from?: Date | undefined;
  to?: Date | undefined;
}) {
  const { testId, from = new Date(0), to = new Date() } = input;

  const allQuery = `
  SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE sd."score" > 0) AS changes,
      COUNT(DISTINCT sd."fileId") FILTER (WHERE sd."score" > 0) AS "uniqueChanges"
    FROM screenshot_diffs sd
    JOIN builds b ON sd."buildId" = b.id
    WHERE sd."testId" = :testId
      AND sd."createdAt" >= :from::timestamp
      AND sd."createdAt" <= :to
      AND b.type = 'reference'
`;

  const fromISOString = from.toISOString();
  const toISOString = to.toISOString();

  const allResult = await knex.raw<{
    rows: {
      total: number;
      changes: number;
      uniqueChanges: number;
    }[];
  }>(allQuery, {
    testId,
    from: fromISOString,
    to: toISOString,
  });

  const all = allResult.rows[0];
  invariant(all);
  return all;
}

/**
 * Get the changes metrics for a test.
 */
export async function getTestSeriesMetrics(input: {
  testId: string;
  from?: Date | undefined;
  to?: Date | undefined;
}) {
  const { testId, from = new Date(0), to = new Date() } = input;
  const tickDistance = getTickDistance(from, to);

  const seriesQuery = `
  WITH aggregated AS (
    SELECT
      to_timestamp(
        FLOOR(EXTRACT(EPOCH FROM sd."createdAt") / EXTRACT(EPOCH FROM :tick::interval)) * EXTRACT(EPOCH FROM :tick::interval)
      ) AT TIME ZONE 'UTC' AS date,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE sd."score" > 0) AS changes,
      COUNT(*) FILTER (
        WHERE sd."score" > 0 and not exists (
          SELECT 1 FROM screenshot_diffs sd2
          JOIN builds b2 ON sd2."buildId" = b2.id
          WHERE sd2."fileId" = sd."fileId"
            AND sd2."testId" = sd."testId"
            AND sd2."buildId" != sd."buildId"
            AND b2.type = 'reference'
        )
      ) AS "uniqueChanges"
    FROM screenshot_diffs sd
    JOIN builds b ON sd."buildId" = b.id
    WHERE sd."testId" = :testId
      AND sd."createdAt" >= :from
      AND sd."createdAt" <= :to
      AND b.type = 'reference'
    GROUP BY date
  ),
  series AS (
    SELECT generate_series(
      to_timestamp(
        FLOOR(EXTRACT(EPOCH FROM :from::timestamp) / EXTRACT(EPOCH FROM :tick::interval)) * EXTRACT(EPOCH FROM :tick::interval)
      ) AT TIME ZONE 'UTC',
      :to,
      :tick::interval
    ) AS date
  )
  SELECT
    s.date,
    COALESCE(a.total, 0) AS total,
    COALESCE(a.changes, 0) AS changes,
    COALESCE(a."uniqueChanges", 0) AS "uniqueChanges"
  FROM series s
  LEFT JOIN aggregated a ON s.date = a.date
  ORDER BY s.date
`;

  const fromISOString = from.toISOString();
  const toISOString = to.toISOString();

  const seriesResult = await knex.raw<{
    rows: {
      date: number;
      total: number;
      changes: number;
      uniqueChanges: number;
    }[];
  }>(seriesQuery, {
    testId,
    from: fromISOString,
    to: toISOString,
    tick: tickDistance,
  });

  const series = seriesResult.rows.map((row) => ({
    ts: row.date,
    total: row.total,
    changes: row.changes,
    uniqueChanges: row.uniqueChanges,
  }));

  return series;
}

/**
 * Get the distance between two points in time.
 */
function getTickDistance(from: Date, to: Date) {
  const diff = to.getTime() - from.getTime();

  if (diff <= 24 * 60 * 60 * 1000) {
    return "20 minutes";
  }
  if (diff <= 3 * 24 * 60 * 60 * 1000) {
    return "1 hour";
  }
  if (diff <= 7 * 24 * 60 * 60 * 1000) {
    return "2 hours";
  }
  if (diff <= 14 * 24 * 60 * 60 * 1000) {
    return "4 hours";
  }
  if (diff <= 30 * 24 * 60 * 60 * 1000) {
    return "12 hours";
  }
  if (diff <= 90 * 24 * 60 * 60 * 1000) {
    return "1 day";
  }

  return "1 year";
}
