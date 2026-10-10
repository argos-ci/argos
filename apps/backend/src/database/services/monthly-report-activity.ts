import { FLAKY_THRESHOLD } from "@argos/util/flakiness";

import config from "@/config";
import { knex } from "@/database";
import type { MonthlyReportActivity } from "@/email/templates/usage_report";
import { computeTestMetrics } from "@/metrics/test";

import type { Account } from "../models";

type Window = { from: Date; to: Date };

function shiftMonth(date: Date, count: number) {
  const shifted = new Date(date);
  shifted.setUTCMonth(shifted.getUTCMonth() + count);
  return shifted;
}

const appUrl = (path: string) => new URL(path, config.get("server.url")).href;

function getBindings(account: Account, window: Window) {
  return {
    accountId: account.id,
    from: window.from.toISOString(),
    to: window.to.toISOString(),
  };
}

async function getChangesReviewed(account: Account, window: Window) {
  const result = await knex.raw<{ rows: { changes: string }[] }>(
    `
    select count(distinct sdr."screenshotDiffId") as changes
    from builds b
    join projects p on p.id = b."projectId"
    join build_reviews br on br."buildId" = b.id
    join screenshot_diff_reviews sdr on sdr."buildReviewId" = br.id
    where p."accountId" = :accountId
      and b."createdAt" >= :from and b."createdAt" < :to
      and br.automatic = false
      and br."dismissedAt" is null
    `,
    getBindings(account, window),
  );
  return Number(result.rows[0]?.changes ?? 0);
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
    `,
    getBindings(account, window),
  );
  const [row] = result.rows;
  return {
    covered: Number(row?.covered ?? 0),
    added: Number(row?.added ?? 0),
  };
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
    with pr_builds as (
      select
        b.id,
        b."projectId",
        b.name,
        b.conclusion,
        b."createdAt",
        coalesce(b."prHeadCommit", sb.commit) as commit,
        coalesce(
          'gh:' || b."githubPullRequestId",
          'origin:' || b."originPullRequestId",
          'branch:' || sb.branch
        ) as pr_key
      from builds b
      join projects p on p.id = b."projectId"
      join screenshot_buckets sb on sb.id = b."compareScreenshotBucketId"
      where p."accountId" = :accountId
        and b.type = 'check'
        and b.conclusion is not null
        and b."createdAt" >= :from and b."createdAt" < :to
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
      select id, "projectId", pr_key
      from sequenced
      where conclusion = 'changes-detected' and clean_later
    ),
    fixed as (
      select distinct f."projectId", f.pr_key
      from flagged f
      where exists (
        select 1
        from screenshot_diffs sd
        where sd."buildId" = f.id
          and (
            sd."baseScreenshotId" is null
            or sd."compareScreenshotId" is null
            or (
              sd.score > 0
              and sd.ignored = false
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
  return {
    pullRequests: Number(row?.pullRequests ?? 0),
    intermediateCommits: Number(row?.intermediateCommits ?? 0),
    fixedPullRequests: Number(row?.fixedPullRequests ?? 0),
  };
}

/**
 * Flaky tests of the account over a window, with the formula of the test page.
 * Per-test lateral reads, so each one goes through the `(testId, date)` indexes.
 */
async function getFlakyTests(account: Account, window: Window) {
  const result = await knex.raw<{
    rows: {
      id: string;
      name: string;
      buildName: string;
      projectName: string;
      total: string | null;
      changes: string;
      uniqueChanges: string;
    }[];
  }>(
    `
    select t.id, t.name, t."buildName", p.name as "projectName", m.total, m.changes, m."uniqueChanges"
    from tests t
    join projects p on p.id = t."projectId"
    join lateral (
      with fp_agg as (
        select sum(tsf.value)::numeric as changes_value, count(*) as fp_count
        from test_stats_fingerprints tsf
        where tsf."testId" = t.id
          and tsf.date >= :from::timestamp and tsf.date < :to::timestamp
        group by tsf.fingerprint
      )
      select
        (
          select sum(tsb.value)::numeric
          from test_stats_builds tsb
          where tsb."testId" = t.id
            and tsb.date >= :from::timestamp and tsb.date < :to::timestamp
        ) as total,
        coalesce((select sum(changes_value) from fp_agg), 0) as changes,
        coalesce((select count(*) from fp_agg where fp_count = 1), 0) as "uniqueChanges"
    ) m on true
    where p."accountId" = :accountId and m.changes > 0
    `,
    getBindings(account, window),
  );
  const flaky = result.rows
    .map((row) => ({
      row,
      metrics: computeTestMetrics({
        total: Number(row.total ?? 0),
        changes: Number(row.changes),
        uniqueChanges: Number(row.uniqueChanges),
      }),
    }))
    .filter(({ metrics }) => metrics.flakiness >= FLAKY_THRESHOLD)
    .sort((a, b) => b.metrics.flakiness - a.metrics.flakiness);
  return {
    ids: flaky.map(({ row }) => row.id),
    count: flaky.length,
    top: flaky.slice(0, 3).map(({ row, metrics }) => ({
      name: row.name,
      buildName: row.buildName,
      flakiness: metrics.flakiness,
      url: appUrl(`/${account.slug}/${row.projectName}/tests/${row.id}`),
    })),
  };
}

async function getScreenshotsByBuildName(account: Account, window: Window) {
  const result = await knex.raw<{
    rows: { projectName: string; name: string; screenshots: string }[];
  }>(
    `
    select p.name as "projectName", sb.name, sum(sb."screenshotCount") as screenshots
    from screenshot_buckets sb
    join projects p on p.id = sb."projectId"
    where p."accountId" = :accountId
      and sb."createdAt" >= :from and sb."createdAt" < :to
    group by p.name, sb.name
    `,
    getBindings(account, window),
  );
  return result.rows.map((row) => ({
    projectName: row.projectName,
    name: row.name,
    screenshots: Number(row.screenshots ?? 0),
  }));
}

/**
 * Activity of the last closed month of the term, compared with the month
 * before it. Null before the first month closes.
 */
export async function getMonthlyReportActivity(
  account: Account,
  months: { startsAt: string; projected: boolean }[],
  termEndsAt: string,
): Promise<MonthlyReportActivity | null> {
  const lastClosedIndex = months.findLastIndex((month) => !month.projected);
  const lastClosed = months[lastClosedIndex];
  if (!lastClosed) {
    return null;
  }
  const from = new Date(lastClosed.startsAt);
  const nextMonth = months[lastClosedIndex + 1];
  const current: Window = {
    from,
    to: new Date(nextMonth ? nextMonth.startsAt : termEndsAt),
  };
  const previous: Window = { from: shiftMonth(from, -1), to: from };

  const [
    changesReviewed,
    previousChangesReviewed,
    tests,
    { flaky, pullRequests },
    previousFlaky,
    screenshots,
    previousScreenshots,
  ] = await Promise.all([
    getChangesReviewed(account, current),
    getChangesReviewed(account, previous),
    getTestCoverage(account, current),
    // The pull requests fixed over the month leave out the flaky tests of
    // that same month, so they wait for them.
    getFlakyTests(account, current).then(async (flaky) => ({
      flaky,
      pullRequests: await getPullRequestActivity(account, current, flaky.ids),
    })),
    getFlakyTests(account, previous),
    getScreenshotsByBuildName(account, current),
    getScreenshotsByBuildName(account, previous),
  ]);

  const projectNames = new Set(
    [...screenshots, ...previousScreenshots].map((entry) => entry.projectName),
  );
  const labelOf = (entry: { projectName: string; name: string }) =>
    projectNames.size === 1
      ? entry.name
      : entry.name === "default"
        ? entry.projectName
        : `${entry.projectName} · ${entry.name}`;
  const previousByLabel = new Map(
    previousScreenshots.map((entry) => [labelOf(entry), entry.screenshots]),
  );
  // Absolute growth rather than relative: a build name tripling from a few
  // hundred screenshots is not what moves the bill.
  const [biggestIncrease] = screenshots
    .map((entry) => ({
      label: labelOf(entry),
      screenshots: entry.screenshots,
      previous: previousByLabel.get(labelOf(entry)) ?? 0,
    }))
    .filter((entry) => entry.previous > 0 && entry.screenshots > entry.previous)
    .sort((a, b) => b.screenshots - b.previous - (a.screenshots - a.previous));

  return {
    from: current.from.toISOString(),
    to: current.to.toISOString(),
    pullRequests: {
      checked: pullRequests.pullRequests,
      fixedAfterFlag: pullRequests.fixedPullRequests,
      intermediateCommits: pullRequests.intermediateCommits,
    },
    changesReviewed: {
      current: changesReviewed,
      previous: previousChangesReviewed,
    },
    tests,
    flakyTests: {
      current: flaky.count,
      previous: previousFlaky.count,
      top: flaky.top,
    },
    screenshots: { biggestIncrease: biggestIncrease ?? null },
  };
}
