import moment from "moment";

import { knex } from "@/database";

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
  const dayISODate = moment(date).startOf("day").toDate().toISOString();

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
            date: dayISODate,
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
          date: dayISODate,
        },
      );
    })(),
  );

  await Promise.all(promises);
}

/**
 * Get the changes metrics for a test.
 */
export async function getTestAllMetrics(
  testIds: string[],
  options: {
    from?: Date | undefined;
    to?: Date | undefined;
  },
): Promise<
  {
    total: number;
    changes: number;
    uniqueChanges: number;
    stability: number;
    consistency: number;
    flakiness: number;
  }[]
> {
  const { from = new Date(0), to = new Date() } = options;

  const allQuery = `
    WITH unique_files AS (
      SELECT
        sd2."testId",
        sd2."fileId"
      FROM screenshot_diffs sd2
      JOIN builds b2 ON sd2."buildId" = b2.id
      WHERE sd2."testId" = ANY(:testIds)
        AND sd2."score" > 0
        AND sd2."createdAt" >= :from::timestamp
        AND sd2."createdAt" < :to
        AND b2.type = 'reference'
      GROUP BY sd2."testId", sd2."fileId"
      HAVING COUNT(*) = 1
    )
    SELECT
      sd."testId",
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE sd."score" > 0) AS changes,
      (SELECT COUNT(*) FROM unique_files uf WHERE uf."testId" = sd."testId") AS "uniqueChanges"
    FROM screenshot_diffs sd
    JOIN builds b ON sd."buildId" = b.id
    WHERE sd."testId" = ANY(:testIds)
      AND sd."createdAt" >= :from::timestamp
      AND sd."createdAt" < :to
      AND b.type = 'reference'
    GROUP BY sd."testId"
  `;

  const fromISOString = from.toISOString();
  const toISOString = to.toISOString();

  const allResult = await knex.raw<{
    rows: {
      testId: string;
      total: number;
      changes: number;
      uniqueChanges: number;
    }[];
  }>(allQuery, {
    testIds,
    from: fromISOString,
    to: toISOString,
  });

  // Map for fast lookup
  const rowByTestId = Object.fromEntries(
    allResult.rows.map((row) => [row.testId, row]),
  );

  // Keep result order same as input
  return testIds.map((testId) => {
    const row = rowByTestId[testId];
    if (!row) {
      return {
        total: 0,
        changes: 0,
        uniqueChanges: 0,
        stability: 1,
        consistency: 1,
        flakiness: 0,
      };
    }
    const stability =
      row.changes > 0
        ? Math.round((1 - row.changes / row.total) * 100) / 100
        : 1;

    const consistency =
      row.changes > 0
        ? row.uniqueChanges > 0
          ? Math.round((row.uniqueChanges / row.changes) * 100) / 100
          : 0
        : 1;

    const flakiness =
      Math.round((1 - (stability + consistency) / 2) * 100) / 100;

    return {
      total: Number(row.total),
      changes: Number(row.changes),
      uniqueChanges: Number(row.uniqueChanges),
      stability,
      consistency,
      flakiness,
    };
  });
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
