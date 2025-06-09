import { invariant } from "@argos/util/invariant";

import { knex } from "@/database";
import { get20MinutesSlot } from "@/util/date";

/**
 * Upsert the test stats for a date and a file.
 */
export async function upsertTestStats(input: {
  /**
   * Test ID to update.
   */
  testId: string;
  /**
   * Date to use (usually the screenshot diff created date).
   */
  date: Date;
  /**
   * File id to process (if the diff is a change).
   */
  fileId: string | null;
}) {
  const { date, fileId, testId } = input;
  const promises: Promise<void>[] = [];
  const slotDate = get20MinutesSlot(date);
  const slotISODate = slotDate.toISOString();

  if (fileId) {
    promises.push(
      (async () => {
        await knex.raw(
          `
            INSERT INTO test_stats_changes ("testId", "fileId", "date", "value")
            VALUES (:testId, :fileId, :date, 1)
            ON CONFLICT ("testId", "fileId", "date") DO
            UPDATE SET value = test_stats_changes.value + 1`,
          {
            testId,
            fileId,
            date: slotISODate,
          },
        );
      })(),
    );
  }

  promises.push(
    (async () => {
      await knex.raw(
        `
    INSERT INTO test_stats_builds ("testId", "date", "value")
    VALUES (:testId, :date, 1)
    ON CONFLICT ("testId", "date") DO
    UPDATE SET value = test_stats_builds.value + 1`,
        {
          testId,
          date: slotISODate,
        },
      );
    })(),
  );

  await Promise.all(promises);
}

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
      (
        SELECT COUNT(*) FROM (
          SELECT sd2."fileId"
          FROM screenshot_diffs sd2
          JOIN builds b2 ON sd2."buildId" = b2.id
          WHERE sd2."testId" = :testId
            AND sd2."score" > 0
            AND sd2."createdAt" >= :from::timestamp
            AND sd2."createdAt" < :to
            AND b2.type = 'reference'
          GROUP BY sd2."fileId"
          HAVING COUNT(*) = 1
        ) AS unique_files
      ) AS "uniqueChanges"
    FROM screenshot_diffs sd
    JOIN builds b ON sd."buildId" = b.id
    WHERE sd."testId" = :testId
      AND sd."createdAt" >= :from::timestamp
      AND sd."createdAt" < :to
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

  const stability =
    all.changes > 0 ? Math.round((1 - all.changes / all.total) * 100) / 100 : 1;

  const consistency =
    all.changes > 0
      ? all.uniqueChanges > 0
        ? Math.round((all.uniqueChanges / all.changes) * 100) / 100
        : 0
      : 1;

  const flakiness = Math.round((1 - (stability + consistency) / 2) * 100) / 100;

  return { ...all, stability, consistency, flakiness };
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
      AND sd."createdAt" < :to
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

  // 1 day (72 points)
  if (diff <= 24 * 60 * 60 * 1000) {
    return "20 minutes";
  }
  // 3 days (72 points)
  if (diff <= 3 * 24 * 60 * 60 * 1000) {
    return "1 hour";
  }
  // 7 days (84 points)
  if (diff <= 7 * 24 * 60 * 60 * 1000) {
    return "2 hours";
  }
  // 14 days (84 points)
  if (diff <= 14 * 24 * 60 * 60 * 1000) {
    return "4 hours";
  }
  // 30 days (60 points)
  if (diff <= 30 * 24 * 60 * 60 * 1000) {
    return "12 hours";
  }
  // 90 days (90 points)
  if (diff <= 90 * 24 * 60 * 60 * 1000) {
    return "1 day";
  }

  return "1 year";
}
