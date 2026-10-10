import { FLAKY_THRESHOLD } from "@argos/util/flakiness";
import { invariant } from "@argos/util/invariant";

import config from "@/config";
import { knex } from "@/database";
import type { MonthlyReportActivity } from "@/email/templates/monthly_report";
import { computeTestMetrics, type TestMetricsCounts } from "@/metrics/test";
import { formatTestId } from "@/util/test-id";

import { ScreenshotDiff, type Account } from "../models";
import { TEST_METRICS_LATERAL } from "./test";

type Window = { from: Date; to: Date };

/** The month a report covers, and the one before it to compare with. */
export type MonthlyReportWindows = { current: Window; previous: Window };

function getBindings(account: Account, window: Window) {
  return {
    accountId: account.id,
    from: window.from.toISOString(),
    to: window.to.toISOString(),
  };
}

/** Both months in one read: the previous one ends where the current starts. */
function getComparisonBindings(
  account: Account,
  windows: MonthlyReportWindows,
) {
  return {
    accountId: account.id,
    previousFrom: windows.previous.from.toISOString(),
    currentFrom: windows.current.from.toISOString(),
    currentTo: windows.current.to.toISOString(),
  };
}

async function getChangesReviewed(
  account: Account,
  windows: MonthlyReportWindows,
) {
  const result = await knex.raw<{
    rows: { current: string; previous: string }[];
  }>(
    `
    select
      count(distinct sdr."screenshotDiffId") filter (where b."createdAt" >= :currentFrom) as current,
      count(distinct sdr."screenshotDiffId") filter (where b."createdAt" < :currentFrom) as previous
    from builds b
    join projects p on p.id = b."projectId"
    join build_reviews br on br."buildId" = b.id
    join screenshot_diff_reviews sdr on sdr."buildReviewId" = br.id
    where p."accountId" = :accountId
      and p."deletedAt" is null
      and b."createdAt" >= :previousFrom and b."createdAt" < :currentTo
      and br.automatic = false
      and br."dismissedAt" is null
    `,
    getComparisonBindings(account, windows),
  );
  const [row] = result.rows;
  invariant(row, "an aggregate returns one row");
  return { current: Number(row.current), previous: Number(row.previous) };
}

/**
 * Tests that ran on the reference branch over the window, and the ones that
 * ran there for the first time. Per-test reads through the `(testId, date)`
 * primary key of the stats.
 */
async function getTestCoverage(account: Account, window: Window) {
  const result = await knex.raw<{
    rows: { covered: string; added: string }[];
  }>(
    `
    select
      count(*) filter (where m.seen) as covered,
      count(*) filter (where m.seen and m.first_seen >= :from::timestamp) as added
    from tests t
    join projects p on p.id = t."projectId"
    join lateral (
      select
        exists (
          select 1 from test_stats_builds tsb
          where tsb."testId" = t.id
            and tsb.date >= :from::timestamp and tsb.date < :to::timestamp
        ) as seen,
        (
          select min(tsb.date) from test_stats_builds tsb
          where tsb."testId" = t.id
        ) as first_seen
    ) m on true
    where p."accountId" = :accountId
      and p."deletedAt" is null
    `,
    getBindings(account, window),
  );
  const [row] = result.rows;
  invariant(row, "an aggregate returns one row");
  return { covered: Number(row.covered), added: Number(row.added) };
}

/**
 * Pull request activity over a window. A pull request counts as fixed when a
 * build flagged a change and a later build of the same pull request and build
 * name came back clean, and the flagged change is not only flaky tests: a
 * flaky screenshot that changes then settles back is noise, not a fix.
 */
async function getPullRequestActivity(
  account: Account,
  window: Window,
  flakyTestIds: string[],
) {
  const result = await knex.raw<{
    rows: {
      pullRequests: string;
      intermediateCommits: string | null;
      fixedPullRequests: string;
    }[];
  }>(
    `
    with checks as (
      select
        b.id,
        b."projectId",
        b.name,
        b.conclusion,
        b."createdAt",
        b.subset,
        sb.branch,
        coalesce(b."prHeadCommit", sb.commit) as commit,
        coalesce(
          'gh:' || b."githubPullRequestId",
          'origin:' || b."originPullRequestId"
        ) as pull_request
      from builds b
      join projects p on p.id = b."projectId"
      join screenshot_buckets sb on sb.id = b."compareScreenshotBucketId"
      where p."accountId" = :accountId
        and p."deletedAt" is null
        and b.type = 'check'
        and b.mode = 'ci'
        -- A merge queue run rebuilds pull requests already counted.
        and b."mergeQueue" = false
        and b.conclusion is not null
        and b."createdAt" >= :from and b."createdAt" < :to
    ),
    pr_builds as (
      -- A build pushed before its pull request opened belongs to it. A branch
      -- that never names one stands for itself: some CI do not tell Argos.
      select
        *,
        coalesce(
          pull_request,
          max(pull_request) over (partition by "projectId", branch),
          'branch:' || branch
        ) as pr_key
      from checks
    ),
    sequenced as (
      select
        *,
        bool_or(conclusion = 'no-changes') over (
          partition by "projectId", name, pr_key
          order by "createdAt"
          rows between 1 following and unbounded following
        ) as clean_later
      from pr_builds
    ),
    flagged as (
      select id, "projectId", pr_key, subset
      from sequenced
      where conclusion = 'changes-detected' and clean_later
    ),
    fixed as (
      -- The changes the build conclusion is drawn from, a changed flaky test
      -- left out.
      select distinct f."projectId", f.pr_key
      from flagged f
      where exists (
        select 1
        from screenshot_diffs sd
        left join screenshots cs on cs.id = sd."compareScreenshotId"
        cross join lateral (
          select ${ScreenshotDiff.selectDiffStatus} as status
        ) diff
        where sd."buildId" = f.id
          and cs."parentName" is null
          and (
            diff.status = 'added'
            or (diff.status = 'removed' and not f.subset)
            or (
              diff.status = 'changed'
              and (
                sd."testId" is null
                or sd."testId" <> all(:flakyTestIds::bigint[])
              )
            )
          )
      )
    ),
    pull_requests as (
      select "projectId", pr_key, count(distinct commit) as commits
      from pr_builds
      group by "projectId", pr_key
    )
    select
      (select count(*) from pull_requests) as "pullRequests",
      (select sum(commits - 1) from pull_requests) as "intermediateCommits",
      (select count(*) from fixed) as "fixedPullRequests"
    `,
    {
      ...getBindings(account, window),
      flakyTestIds: `{${flakyTestIds.join(",")}}`,
    },
  );
  const [row] = result.rows;
  invariant(row, "an aggregate returns one row");
  return {
    checked: Number(row.pullRequests),
    // Null when there was no pull request to sum over.
    intermediateCommits: Number(row.intermediateCommits ?? 0),
    fixedAfterFlag: Number(row.fixedPullRequests),
  };
}

/** Flaky tests of the account over a window, as the test pages count them. */
async function getFlakyTests(account: Account, window: Window) {
  const result = await knex.raw<{
    rows: {
      id: string;
      name: string;
      buildName: string;
      projectName: string;
      metrics: TestMetricsCounts;
    }[];
  }>(
    `
    select
      "tests".id,
      "tests".name,
      "tests"."buildName",
      p.name as "projectName",
      test_metrics.metrics
    from tests
    join projects p on p.id = "tests"."projectId"
    ${TEST_METRICS_LATERAL}
    where p."accountId" = :accountId
      and p."deletedAt" is null
      and (test_metrics.metrics->>'changes')::bigint > 0
    `,
    getBindings(account, window),
  );
  const flaky = result.rows
    .map((row) => ({ row, metrics: computeTestMetrics(row.metrics) }))
    .filter(({ metrics }) => metrics.flakiness >= FLAKY_THRESHOLD)
    .sort((a, b) => b.metrics.flakiness - a.metrics.flakiness);
  return {
    ids: flaky.map(({ row }) => row.id),
    count: flaky.length,
    top: flaky.slice(0, 3).map(({ row, metrics }) => {
      const testId = formatTestId({
        projectName: row.projectName,
        testId: row.id,
      });
      return {
        name: row.name,
        buildName: row.buildName,
        flakiness: metrics.flakiness,
        url: new URL(
          `/${account.slug}/${row.projectName}/tests/${testId}`,
          config.get("server.url"),
        ).href,
      };
    }),
  };
}

async function getScreenshotsByBuildName(
  account: Account,
  windows: MonthlyReportWindows,
) {
  const result = await knex.raw<{
    rows: {
      projectName: string;
      name: string;
      current: string;
      previous: string;
    }[];
  }>(
    `
    select
      p.name as "projectName",
      sb.name,
      coalesce(sum(sb."screenshotCount") filter (where sb."createdAt" >= :currentFrom), 0) as current,
      coalesce(sum(sb."screenshotCount") filter (where sb."createdAt" < :currentFrom), 0) as previous
    from screenshot_buckets sb
    join projects p on p.id = sb."projectId"
    where p."accountId" = :accountId
      and p."deletedAt" is null
      and sb."createdAt" >= :previousFrom and sb."createdAt" < :currentTo
    group by p.name, sb.name
    `,
    getComparisonBindings(account, windows),
  );
  return result.rows.map((row) => ({
    projectName: row.projectName,
    name: row.name,
    current: Number(row.current),
    previous: Number(row.previous),
  }));
}

/**
 * Activity of the month a report covers, compared with the month before it.
 *
 * One query at a time: the report runs on a worker whose database pool the
 * other jobs share, and it does not have to be fast.
 */
export async function getMonthlyReportActivity(
  account: Account,
  windows: MonthlyReportWindows,
): Promise<MonthlyReportActivity> {
  const changesReviewed = await getChangesReviewed(account, windows);
  const tests = await getTestCoverage(account, windows.current);
  const flaky = await getFlakyTests(account, windows.current);
  const previousFlaky = await getFlakyTests(account, windows.previous);
  // The pull requests fixed over the month leave out its flaky tests.
  const pullRequests = await getPullRequestActivity(
    account,
    windows.current,
    flaky.ids,
  );
  const screenshots = await getScreenshotsByBuildName(account, windows);

  const projectNames = new Set(screenshots.map((entry) => entry.projectName));
  const labelOf = (entry: { projectName: string; name: string }) =>
    projectNames.size === 1
      ? entry.name
      : entry.name === "default"
        ? entry.projectName
        : `${entry.projectName} · ${entry.name}`;
  // Absolute growth rather than relative: a build name tripling from a few
  // hundred screenshots is not what moves the bill.
  const [biggestIncrease] = screenshots
    .filter((entry) => entry.previous > 0 && entry.current > entry.previous)
    .sort((a, b) => b.current - b.previous - (a.current - a.previous))
    .map((entry) => ({
      label: labelOf(entry),
      screenshots: entry.current,
      previous: entry.previous,
    }));

  return {
    from: windows.current.from.toISOString(),
    to: windows.current.to.toISOString(),
    pullRequests,
    changesReviewed,
    tests,
    flakyTests: {
      current: flaky.count,
      previous: previousFlaky.count,
      top: flaky.top,
    },
    screenshots: { biggestIncrease: biggestIncrease ?? null },
  };
}
