import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { upsertTestStats } from "@/metrics/test";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

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

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

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

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

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
});
