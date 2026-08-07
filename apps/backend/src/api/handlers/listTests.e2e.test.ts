import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  Account,
  IgnoredChange,
  Project,
  Test,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { listIgnoredChanges } from "./listIgnoredChanges";
import { listTests } from "./listTests";

const app = createTestHandlerApp(listTests, listIgnoredChanges);

const test = base.extend<{
  user: User;
  account: Account;
  project: Project;
  token: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await use(user);
  },
  account: async ({ user }, use) => {
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    await use(account);
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({
      name: "web",
      accountId: account.id,
    });
    await use(project);
  },
  token: async ({ user, account }, use) => {
    const token = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });
    await use(token);
  },
});

/**
 * Build a reference build whose screenshots make the given tests "active" —
 * that is what `queryActiveTests` lists.
 */
async function seedActiveTests(args: {
  project: Project;
  names: string[];
  buildName?: string;
}): Promise<Test[]> {
  const { project, names, buildName = "default" } = args;
  const bucket = await factory.ScreenshotBucket.create({
    projectId: project.id,
    name: buildName,
  });
  const build = await factory.Build.create({
    projectId: project.id,
    compareScreenshotBucketId: bucket.id,
    name: buildName,
    type: "reference",
  });
  const tests: Test[] = [];
  for (const name of names) {
    const testRow = await factory.Test.create({
      projectId: project.id,
      name,
      buildName,
    });
    const screenshot = await factory.Screenshot.create({
      name,
      screenshotBucketId: bucket.id,
      testId: testRow.id,
    });
    await factory.ScreenshotDiff.create({
      buildId: build.id,
      testId: testRow.id,
      compareScreenshotId: screenshot.id,
      score: 0,
      jobStatus: "complete",
    });
    tests.push(testRow);
  }
  return tests;
}

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("listTests", () => {
  test("lists the project's active tests", async ({ project, token }) => {
    await seedActiveTests({ project, names: ["home", "login"] });

    const res = await request(app)
      .get("/projects/acme/web/tests")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.pageInfo.total).toBe(2);
    expect(
      res.body.results.map((row: { name: string }) => row.name).sort(),
    ).toEqual(["home", "login"]);
    expect(res.body.results[0]).toMatchObject({
      id: expect.any(String),
      buildName: "default",
      metrics: {
        total: expect.any(Number),
        changes: expect.any(Number),
        flakiness: expect.any(Number),
      },
    });
  });

  test("returns an empty page for a project with no builds", async ({
    project,
    token,
  }) => {
    expect(project.name).toBe("web");

    const res = await request(app)
      .get("/projects/acme/web/tests")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      results: [],
      pageInfo: { total: 0, page: 1, perPage: 30 },
    });
  });

  test("filters by name", async ({ project, token }) => {
    await seedActiveTests({ project, names: ["home", "login"] });

    const res = await request(app)
      .get("/projects/acme/web/tests?search=log")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].name).toBe("login");
  });

  test("filters by build name", async ({ project, token }) => {
    await seedActiveTests({ project, names: ["home"], buildName: "default" });
    await seedActiveTests({ project, names: ["widget"], buildName: "sb" });

    const res = await request(app)
      .get("/projects/acme/web/tests?buildName=sb")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].name).toBe("widget");
  });

  test("paginates", async ({ project, token }) => {
    await seedActiveTests({ project, names: ["home", "login"] });

    const res = await request(app)
      .get("/projects/acme/web/tests?perPage=1&page=2")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.pageInfo).toEqual({ total: 2, page: 2, perPage: 1 });
  });

  test("400s on an unknown metrics period", async ({ token }) => {
    await request(app)
      .get("/projects/acme/web/tests?metricsPeriod=LAST_MILLENNIUM")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  test("401s when the token is not scoped to the account", async ({ user }) => {
    const other = await factory.TeamAccount.create({ slug: "other" });
    const token = `arp_${"f".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: other.id,
    });

    await request(app)
      .get("/projects/acme/web/tests")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });
});

describe("listIgnoredChanges", () => {
  test("lists the ignored changes with their test", async ({
    project,
    token,
  }) => {
    const [testRow] = await seedActiveTests({ project, names: ["home"] });
    invariant(testRow);
    await IgnoredChange.query().insert({
      projectId: project.id,
      testId: testRow.id,
      fingerprint: "abc123",
    });

    const res = await request(app)
      .get("/projects/acme/web/ignored-changes")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.pageInfo.total).toBe(1);
    expect(res.body.results[0]).toMatchObject({
      id: expect.any(String),
      test: { name: "home", buildName: "default" },
    });
  });

  test("returns an empty page when nothing is ignored", async ({
    project,
    token,
  }) => {
    expect(project.name).toBe("web");

    const res = await request(app)
      .get("/projects/acme/web/ignored-changes")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      results: [],
      pageInfo: { total: 0, page: 1, perPage: 30 },
    });
  });

  test("does not leak another project's ignored changes", async ({
    account,
    project,
    token,
  }) => {
    const other = await factory.Project.create({
      name: "other",
      accountId: account.id,
    });
    const [testRow] = await seedActiveTests({
      project: other,
      names: ["home"],
    });
    invariant(testRow);
    await IgnoredChange.query().insert({
      projectId: other.id,
      testId: testRow.id,
      fingerprint: "abc123",
    });
    expect(project.name).toBe("web");

    const res = await request(app)
      .get("/projects/acme/web/ignored-changes")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.pageInfo.total).toBe(0);
  });
});
