import { knex } from "@/database";
import { Project } from "@/database/models";

/**
 * Get the number of screenshots taken by a project over a groupByiod of time.
 */
export async function getAccountScreenshotMetrics(input: {
  accountId: string;
  projectIds?: string[] | undefined | null;
  from: Date;
  to: Date;
  groupBy: "month" | "week" | "day";
}) {
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
      AND sb."createdAt" <= date_trunc(:groupBy, :to::timestamp)
      ${input.projectIds && input.projectIds.length > 0 ? `AND sb."projectId" = any(:projectIds)` : ""}
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
      date_trunc(:groupBy, :to::timestamp),
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
  if (input.projectIds && input.projectIds.length > 0) {
    projectsQuery.whereIn("id", input.projectIds);
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
