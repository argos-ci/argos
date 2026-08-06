import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import {
  getStartDateFromPeriod,
  getTestAllMetrics,
  upsertTestStats,
} from "@/metrics/test";

import { IMetricsPeriod } from "../__generated__/resolver-types";
import { expectNoGraphQLError } from "../testing";
import { createGraphQLApp } from "./util";

const ACCOUNT_TESTS_QUERY = `
  query AccountTests($accountSlug: String!, $period: MetricsPeriod!) {
    account(slug: $accountSlug) {
      id
      tests(first: 30, after: 0, period: $period) {
        pageInfo {
          totalCount
        }
        edges {
          name
          project {
            name
          }
          metrics(period: $period) {
            all {
              total
              changes
              uniqueChanges
              stability
              consistency
              flakiness
            }
          }
        }
      }
    }
  }
`;

/**
 * Create a test that shows up as "active": present in the latest reference
 * build of its project via a non-orphan compare screenshot diff.
 */
async function createActiveTest(project: Project, name: string) {
  const test = await factory.Test.create({ projectId: project.id, name });
  const build = await factory.Build.create({
    projectId: project.id,
    type: "reference",
  });
  await factory.ScreenshotDiff.create({ buildId: build.id, testId: test.id });
  return test;
}

describe("GraphQL Account.tests", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("aggregates active tests across projects sorted by flakiness", async () => {
    // A team account whose owner is making the request (exercises the team
    // visibility gate, not the staff shortcut).
    const user = await factory.User.create();
    const account = await factory.TeamAccount.create();
    invariant(account.teamId, "team account should have a team");
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });

    const [projectA, projectB] = await Promise.all([
      factory.Project.create({ accountId: account.id, name: "project-a" }),
      factory.Project.create({ accountId: account.id, name: "project-b" }),
    ]);

    const flakyTest = await createActiveTest(projectA, "flaky-test");
    const stableTest = await createActiveTest(projectB, "stable-test");

    const file = await factory.File.create({
      type: "screenshotDiff",
      fingerprint: "flaky-fp",
    });

    // Drive the stats over the period. The flaky test changes on the same
    // fingerprint every day (stability 0, consistency 0 -> flakiness ~1); the
    // stable test is only ever seen with no change (flakiness 0).
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      await upsertTestStats({
        testId: flakyTest.id,
        date,
        change: { fileId: file.id, fingerprint: "flaky-fp" },
      });
      await upsertTestStats({
        testId: stableTest.id,
        date,
        change: null,
      });
    }

    const app = createGraphQLApp({ user, account });

    const result = await request(app)
      .post("/graphql")
      .send({
        query: ACCOUNT_TESTS_QUERY,
        variables: { accountSlug: account.slug, period: "LAST_7_DAYS" },
      });

    expectNoGraphQLError(result);
    expect(result.status).toBe(200);

    const tests = result.body.data.account.tests;

    // Both projects' active tests are aggregated into one list.
    expect(tests.pageInfo.totalCount).toBe(2);
    expect(tests.edges.map((edge: { name: string }) => edge.name)).toEqual(
      expect.arrayContaining(["flaky-test", "stable-test"]),
    );

    // Sorted by flakiness descending, across project boundaries, with the
    // owning project resolved on each row.
    expect(tests.edges[0].name).toBe("flaky-test");
    expect(tests.edges[0].project.name).toBe("project-a");
    expect(tests.edges[1].name).toBe("stable-test");
    expect(tests.edges[1].project.name).toBe("project-b");
    expect(tests.edges[0].metrics.all.flakiness).toBeGreaterThan(
      tests.edges[1].metrics.all.flakiness,
    );
  });

  it("returns an empty connection when the account has no visible projects", async () => {
    const user = await factory.User.create();
    const account = await factory.TeamAccount.create();
    invariant(account.teamId, "team account should have a team");
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });

    const app = createGraphQLApp({ user, account });

    const result = await request(app)
      .post("/graphql")
      .send({
        query: ACCOUNT_TESTS_QUERY,
        variables: { accountSlug: account.slug, period: "LAST_7_DAYS" },
      });

    expectNoGraphQLError(result);
    expect(result.body.data.account.tests.pageInfo.totalCount).toBe(0);
    expect(result.body.data.account.tests.edges).toEqual([]);
  });

  // The list orders rows by a flakiness computed in SQL, then serves each row's
  // metrics from the counts that same pass produced. If the SQL formula and
  // `computeTestMetrics` ever drift, a row is sorted by one number and displays
  // another — so pin the served values against an independent computation.
  it("serves metrics that match the flakiness it sorts by", async () => {
    const user = await factory.User.create();
    const account = await factory.TeamAccount.create();
    invariant(account.teamId, "team account should have a team");
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    const project = await factory.Project.create({ accountId: account.id });
    const test = await createActiveTest(project, "partly-flaky-test");

    const file = await factory.File.create({
      type: "screenshotDiff",
      fingerprint: "recurring",
    });

    // A mix that exercises every branch of the formula: some builds with no
    // change, one fingerprint recurring across days, one seen a single day.
    const today = new Date();
    for (let i = 0; i < 4; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      await upsertTestStats({
        testId: test.id,
        date,
        change: i < 2 ? { fileId: file.id, fingerprint: "recurring" } : null,
      });
    }
    await upsertTestStats({
      testId: test.id,
      date: today,
      change: { fileId: file.id, fingerprint: "one-off" },
    });

    const app = createGraphQLApp({ user, account });

    const result = await request(app)
      .post("/graphql")
      .send({
        query: ACCOUNT_TESTS_QUERY,
        variables: { accountSlug: account.slug, period: "LAST_7_DAYS" },
      });

    expectNoGraphQLError(result);

    const [edge] = result.body.data.account.tests.edges;
    const [expected] = await getTestAllMetrics([test.id], {
      from: getStartDateFromPeriod(IMetricsPeriod.Last_7Days),
    });
    invariant(expected);

    expect(edge.metrics.all).toEqual({
      total: expected.total,
      changes: expected.changes,
      uniqueChanges: expected.uniqueChanges,
      stability: expected.stability,
      consistency: expected.consistency,
      flakiness: expected.flakiness,
    });
    // Guard against the assertion passing on an all-zero row.
    expect(expected.changes).toBeGreaterThan(0);
    expect(expected.flakiness).toBeGreaterThan(0);
  });
});
