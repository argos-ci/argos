import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Project, Test } from "@/database/models";
import { IgnoredChange } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { formatTestId } from "@/util/test-id";

import { expectNoGraphQLError } from "../testing";
import { createGraphQLApp } from "./util";

const TEST_CHANGES_QUERY = `
  query TestChanges(
    $accountSlug: String!
    $projectName: String!
    $testId: ID!
    $ignored: Boolean
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      test(id: $testId) {
        id
        changes(period: LAST_7_DAYS, after: 0, first: 30, ignored: $ignored) {
          pageInfo {
            totalCount
          }
          edges {
            ignored
          }
        }
      }
    }
  }
`;

const IGNORED_FINGERPRINT = "ignored-fp";

describe("GraphQL Test.changes", () => {
  let userAccount: Account;
  let project: Project;
  let visualTest: Test;

  /**
   * A change is a distinct fingerprint seen in an auto-approved build of the
   * test, so each one needs its own reference build carrying a diff.
   */
  async function createChange(input: { test: Test; fingerprint: string }) {
    const build = await factory.Build.create({
      projectId: project.id,
      type: "reference",
    });
    await factory.ScreenshotDiff.create({
      buildId: build.id,
      testId: input.test.id,
      fingerprint: input.fingerprint,
      score: 0.5,
    });
  }

  async function queryChanges(
    input: { test?: Test; ignored?: boolean } = {},
  ): Promise<{
    pageInfo: { totalCount: number };
    edges: { ignored: boolean }[];
  }> {
    const { test = visualTest, ignored } = input;
    const user = userAccount.user;
    invariant(user, "the user account should have a user");
    const app = createGraphQLApp({ user, account: userAccount });
    const res = await request(app)
      .post("/graphql")
      .send({
        query: TEST_CHANGES_QUERY,
        variables: {
          accountSlug: userAccount.slug,
          projectName: project.name,
          testId: formatTestId({ projectName: project.name, testId: test.id }),
          ignored,
        },
      });
    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    return res.body.data.project.test.changes;
  }

  beforeEach(async () => {
    await setupDatabase();
    userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    project = await factory.Project.create({ accountId: userAccount.id });
    visualTest = await factory.Test.create({ projectId: project.id });
    await createChange({ test: visualTest, fingerprint: IGNORED_FINGERPRINT });
    await createChange({ test: visualTest, fingerprint: "live-fp" });
    await IgnoredChange.query().insert({
      projectId: project.id,
      testId: visualTest.id,
      fingerprint: IGNORED_FINGERPRINT,
    });
  });

  it("returns ignored and non-ignored changes alike by default", async () => {
    const changes = await queryChanges();
    expect(changes.pageInfo.totalCount).toBe(2);
    expect(changes.edges.filter((edge) => edge.ignored)).toHaveLength(1);
    expect(changes.edges.filter((edge) => !edge.ignored)).toHaveLength(1);
  });

  it("returns only the ignored changes when `ignored` is true", async () => {
    const changes = await queryChanges({ ignored: true });
    expect(changes.pageInfo.totalCount).toBe(1);
    expect(changes.edges).toEqual([{ ignored: true }]);
  });

  it("returns only the changes still under review when `ignored` is false", async () => {
    const changes = await queryChanges({ ignored: false });
    expect(changes.pageInfo.totalCount).toBe(1);
    expect(changes.edges).toEqual([{ ignored: false }]);
  });

  it("scopes the filter to the test it is asked about", async () => {
    // Same fingerprint on another test of the same project: ignoring it on
    // `visualTest` says nothing about this one.
    const otherTest = await factory.Test.create({
      projectId: project.id,
      name: "other-test",
    });
    await createChange({ test: otherTest, fingerprint: IGNORED_FINGERPRINT });

    const ignoredChanges = await queryChanges({
      test: otherTest,
      ignored: true,
    });
    expect(ignoredChanges.pageInfo.totalCount).toBe(0);
    expect(ignoredChanges.edges).toEqual([]);

    const liveChanges = await queryChanges({ test: otherTest, ignored: false });
    expect(liveChanges.pageInfo.totalCount).toBe(1);
    expect(liveChanges.edges).toEqual([{ ignored: false }]);
  });
});
