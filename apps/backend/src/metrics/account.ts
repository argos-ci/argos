import { invariant } from "@argos/util/invariant";

import { knex } from "@/database";
import { Project } from "@/database/models";

type AccountMetricsGroupBy = "month" | "week" | "day";

type AccountMetricsFilter = {
  accountId: string;
  projectNames?: string[] | null | undefined;
};

type AccountMetricsAggregationInput = {
  accountId: string;
  projectIds?: string[] | null | undefined;
  projectFilterApplied?: boolean | undefined;
  from: Date;
  to: Date;
  groupBy: AccountMetricsGroupBy;
};

export type GetAccountMetricsInput = AccountMetricsFilter & {
  from: Date;
  to?: Date | null | undefined;
  groupBy: AccountMetricsGroupBy;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ACCOUNT_METRICS_MAX_RANGE_DAYS = 365;

export class InvalidAccountMetricsInputError extends Error {}

function hasProjectFilter(input: AccountMetricsAggregationInput) {
  if (input.projectFilterApplied !== undefined) {
    return input.projectFilterApplied;
  }
  return (
    input.projectIds !== null &&
    input.projectIds !== undefined &&
    input.projectIds.length > 0
  );
}

async function resolveProjectIds(input: AccountMetricsFilter) {
  if (!input.projectNames || input.projectNames.length === 0) {
    return { projectIds: undefined, projectFilterApplied: false };
  }

  const projects = await Project.query()
    .select("id")
    .where("accountId", input.accountId)
    .whereIn("name", input.projectNames);

  return {
    projectIds: projects.map((project) => project.id),
    projectFilterApplied: true,
  };
}

/**
 * Get all account metrics, resolving project names before aggregating them.
 *
 * This is the shared entry point for GraphQL and the REST API. The lower-level
 * functions remain available for callers that already have project IDs.
 */
export async function getAccountMetrics(input: GetAccountMetricsInput) {
  const to = input.to ?? new Date();

  if (input.from.getTime() > to.getTime()) {
    throw new InvalidAccountMetricsInputError("`from` must be before `to`.");
  }

  const durationDays = Math.floor(
    (to.getTime() - input.from.getTime()) / DAY_IN_MS,
  );
  if (durationDays > ACCOUNT_METRICS_MAX_RANGE_DAYS) {
    throw new InvalidAccountMetricsInputError(
      `Date range cannot exceed ${ACCOUNT_METRICS_MAX_RANGE_DAYS} days.`,
    );
  }

  const projectFilter = await resolveProjectIds(input);
  const params: AccountMetricsAggregationInput = {
    accountId: input.accountId,
    ...projectFilter,
    from: input.from,
    to,
    groupBy: input.groupBy,
  };
  const [screenshots, builds] = await Promise.all([
    getAccountScreenshotMetrics(params),
    getAccountBuildMetrics(params),
  ]);

  return { screenshots, builds };
}

/**
 * Get the number of screenshots by projects over time.
 */
export async function getAccountScreenshotMetrics(
  input: AccountMetricsAggregationInput,
) {
  const interval = `1 ${input.groupBy}`;
  const query = `
  WITH aggregated AS (
    SELECT
      date_trunc(:groupBy, sb."createdAt") AS date,
      p.id AS "projectId",
      SUM(sb."screenshotCount") AS value
    FROM screenshot_buckets sb
    LEFT JOIN projects p ON sb."projectId" = p.id
    WHERE p."accountId" = :accountId
      AND sb."createdAt" >= date_trunc(:groupBy, :from::timestamp)
      AND sb."createdAt" <= :to
      ${hasProjectFilter(input) ? `AND sb."projectId" = any(:projectIds)` : ""}
    GROUP BY date, p.id
  ),
  non_zero_projects AS (
    SELECT "projectId"
    FROM aggregated
    GROUP BY "projectId"
    HAVING SUM(value) > 0
  ),
  series AS (
    SELECT generate_series(
      date_trunc(:groupBy, :from::timestamp),
      :to,
      INTERVAL '${interval}'
    ) AS date
  )
  SELECT
    s.date,
    jsonb_object_agg(a."projectId", COALESCE(a.value, 0))
      FILTER (WHERE a."projectId" IS NOT NULL) AS counts
  FROM series s
  LEFT JOIN aggregated a
    ON s.date = a.date
    AND a."projectId" IN (SELECT "projectId" FROM non_zero_projects)
  GROUP BY s.date
  ORDER BY s.date
  `;

  const projectsQuery = Project.query().where("accountId", input.accountId);
  if (hasProjectFilter(input)) {
    const projectIds = input.projectIds;
    invariant(projectIds, "project IDs are required when filtering metrics");
    projectsQuery.whereIn("id", projectIds);
  }
  const [result, inputProjects] = await Promise.all([
    knex.raw<{
      rows: { date: number; counts: Record<string, number> | null }[];
    }>(query, {
      accountId: input.accountId,
      projectIds: input.projectIds,
      from: input.from.toISOString(),
      to: input.to.toISOString(),
      groupBy: input.groupBy,
    }),
    projectsQuery,
  ]);

  // Get the list of projects
  const projectIds = new Set(
    result.rows.flatMap((row) => Object.keys(row.counts ?? {})),
  );
  const projects = inputProjects.filter((project) =>
    projectIds.has(project.id),
  );

  const series = result.rows.map((row) => {
    let total = 0;
    const projectCounts = projects.reduce(
      (acc, project) => {
        const count = row.counts?.[project.id] ?? 0;
        acc[project.id] = count;
        total += count;
        return acc;
      },
      {} as Record<string, number>,
    );
    return {
      ts: new Date(row.date).getTime(),
      projects: projectCounts,
      total,
    };
  });

  const all = series.reduce<{
    total: number;
    projects: Record<string, number>;
  }>(
    (acc, serie) => {
      acc.total += serie.total;
      Object.entries(serie.projects).forEach(([projectId, count]) => {
        acc.projects[projectId] = (acc.projects[projectId] ?? 0) + count;
      });
      return acc;
    },
    { total: 0, projects: {} },
  );

  return { series, all, projects };
}

/**
 * Get the number of builds by projects over time.
 */
export async function getAccountBuildMetrics(
  input: AccountMetricsAggregationInput,
) {
  const interval = `1 ${input.groupBy}`;
  const query = `
    WITH aggregated AS (
    SELECT
      date_trunc(:groupBy, b."createdAt") AS date,
      p.id AS "projectId",
      COUNT(b.id) AS value,
      COUNT(b.id) FILTER (WHERE b.conclusion = 'changes-detected') AS "changesDetected",
      COUNT(b.id) FILTER (WHERE b.conclusion = 'no-changes') AS "noChanges",
      COUNT(b.id) FILTER (WHERE b.conclusion = 'changes-detected' AND r.approved AND NOT r.rejected) AS accepted,
      COUNT(b.id) FILTER (WHERE b.conclusion = 'changes-detected' AND r.rejected) AS rejected
    FROM builds b
    LEFT JOIN projects p ON b."projectId" = p.id
    LEFT JOIN LATERAL (
      SELECT
        bool_or(lr.state = 'approved') AS approved,
        bool_or(lr.state = 'rejected') AS rejected
      FROM (
        SELECT DISTINCT ON (br."userId") br.state, br."dismissedAt"
        FROM build_reviews br
        WHERE br."buildId" = b.id
        ORDER BY br."userId", br."createdAt" DESC, br.id DESC
      ) lr
      WHERE lr."dismissedAt" IS NULL
        AND lr.state IN ('approved', 'rejected')
    ) r ON TRUE
    WHERE p."accountId" = :accountId
      AND b."createdAt" >= date_trunc(:groupBy, :from::timestamp)
      AND b."createdAt" <= :to
      ${hasProjectFilter(input) ? `AND b."projectId" = any(:projectIds)` : ""}
    GROUP BY date, p.id
  ),
  non_zero_projects AS (
    SELECT "projectId"
    FROM aggregated
    GROUP BY "projectId"
    HAVING SUM(value) > 0
  ),
  series AS (
    SELECT generate_series(
      date_trunc(:groupBy, :from::timestamp),
      :to,
      INTERVAL '${interval}'
    ) AS date
  )
  SELECT
    s.date,
    jsonb_object_agg(a."projectId", COALESCE(a.value, 0))
      FILTER (WHERE a."projectId" IS NOT NULL) AS counts,
    COALESCE(SUM(a."changesDetected"), 0)::int AS "changesDetected",
    COALESCE(SUM(a."noChanges"), 0)::int AS "noChanges",
    COALESCE(SUM(a.accepted), 0)::int AS accepted,
    COALESCE(SUM(a.rejected), 0)::int AS rejected
  FROM series s
  LEFT JOIN aggregated a
    ON s.date = a.date
    AND a."projectId" IN (SELECT "projectId" FROM non_zero_projects)
  GROUP BY s.date
  ORDER BY s.date
  `;

  const projectsQuery = Project.query().where("accountId", input.accountId);
  if (hasProjectFilter(input)) {
    const projectIds = input.projectIds;
    invariant(projectIds, "project IDs are required when filtering metrics");
    projectsQuery.whereIn("id", projectIds);
  }
  const [result, inputProjects] = await Promise.all([
    knex.raw<{
      rows: {
        date: number;
        counts: Record<string, number> | null;
        changesDetected: number;
        noChanges: number;
        accepted: number;
        rejected: number;
      }[];
    }>(query, {
      accountId: input.accountId,
      projectIds: input.projectIds,
      from: input.from.toISOString(),
      to: input.to.toISOString(),
      groupBy: input.groupBy,
    }),
    projectsQuery,
  ]);

  // Get the list of projects
  const projectIds = new Set(
    result.rows.flatMap((row) => Object.keys(row.counts ?? {})),
  );
  const projects = inputProjects.filter((project) =>
    projectIds.has(project.id),
  );

  const series = result.rows.map((row) => {
    let total = 0;
    const projectCounts = projects.reduce(
      (acc, project) => {
        const count = row.counts?.[project.id] ?? 0;
        acc[project.id] = count;
        total += count;
        return acc;
      },
      {} as Record<string, number>,
    );
    return {
      ts: new Date(row.date).getTime(),
      projects: projectCounts,
      total,
      changesDetected: row.changesDetected,
      noChanges: row.noChanges,
      accepted: row.accepted,
      rejected: row.rejected,
    };
  });

  const all = series.reduce<{
    total: number;
    projects: Record<string, number>;
    changesDetected: number;
    noChanges: number;
    accepted: number;
    rejected: number;
  }>(
    (acc, serie) => {
      acc.total += serie.total;
      acc.changesDetected += serie.changesDetected;
      acc.noChanges += serie.noChanges;
      acc.accepted += serie.accepted;
      acc.rejected += serie.rejected;
      Object.entries(serie.projects).forEach(([projectId, count]) => {
        acc.projects[projectId] = (acc.projects[projectId] ?? 0) + count;
      });
      return acc;
    },
    {
      total: 0,
      projects: {},
      changesDetected: 0,
      noChanges: 0,
      accepted: 0,
      rejected: 0,
    },
  );

  return { series, all, projects };
}
