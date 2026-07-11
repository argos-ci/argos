import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { Account, User, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getAccountAnalytics } from "./getAccountAnalytics";

const app = createTestHandlerApp(getAccountAnalytics);

const test = base.extend<{
  user: User;
  account: Account;
  patToken: string;
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
  patToken: async ({ account, user }, use) => {
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

const analyticsQuery = {
  from: "2020-12-31T00:00:00.000Z",
  to: "2021-01-02T00:00:00.000Z",
  groupBy: "day",
};

describe("getAccountAnalytics", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("returns analytics filtered by project names", async ({
    account,
    patToken,
  }) => {
    const [webProject, docsProject] = await Promise.all([
      factory.Project.create({ accountId: account.id, name: "web" }),
      factory.Project.create({ accountId: account.id, name: "docs" }),
    ]);
    await factory.ScreenshotBucket.createMany(2, [
      {
        projectId: webProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
        screenshotCount: 2,
      },
      {
        projectId: docsProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
        screenshotCount: 3,
      },
    ]);
    await factory.Build.createMany(2, [
      {
        projectId: webProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
      },
      {
        projectId: docsProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
      },
    ]);

    const res = await request(app)
      .get("/accounts/acme/analytics")
      .query({ ...analyticsQuery, projectNames: webProject.name })
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      screenshots: {
        all: {
          total: 2,
          projects: { [webProject.id]: 2 },
        },
        projects: [{ id: webProject.id, name: webProject.name }],
      },
      builds: {
        all: {
          total: 1,
          projects: { [webProject.id]: 1 },
        },
        projects: [{ id: webProject.id, name: webProject.name }],
      },
    });
    expect(res.body.screenshots.projects[0]).toEqual({
      id: webProject.id,
      name: webProject.name,
    });
  });

  test("returns no metrics when a project name does not match", async ({
    account,
    patToken,
  }) => {
    const project = await factory.Project.create({
      accountId: account.id,
      name: "web",
    });
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date("2021-01-01").toISOString(),
      screenshotCount: 2,
    });
    await factory.Build.create({
      projectId: project.id,
      createdAt: new Date("2021-01-01").toISOString(),
    });

    const res = await request(app)
      .get("/accounts/acme/analytics")
      .query({ ...analyticsQuery, projectNames: "missing" })
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);

    expect(res.body.screenshots.all).toEqual({ total: 0, projects: {} });
    expect(res.body.screenshots.projects).toEqual([]);
    expect(res.body.builds.all.total).toBe(0);
    expect(res.body.builds.all.projects).toEqual({});
    expect(res.body.builds.projects).toEqual([]);
  });

  test("returns 400 when the date range is invalid", async ({ patToken }) => {
    await request(app)
      .get("/accounts/acme/analytics")
      .query({
        from: "2021-01-02T00:00:00.000Z",
        to: "2021-01-01T00:00:00.000Z",
        groupBy: "day",
      })
      .set("Authorization", `Bearer ${patToken}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("`from` must be before `to`.");
      });
  });

  test("returns 401 when the token is not scoped to the account", async ({
    patToken,
  }) => {
    await factory.TeamAccount.create({ slug: "other" });

    await request(app)
      .get("/accounts/other/analytics")
      .query(analyticsQuery)
      .set("Authorization", `Bearer ${patToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toContain(
          "You do not have access to this account.",
        );
      });
  });

  test("rejects project tokens", async ({ account }) => {
    const project = await factory.Project.create({
      accountId: account.id,
      token: "the-awesome-token",
    });

    await request(app)
      .get("/accounts/acme/analytics")
      .query(analyticsQuery)
      .set("Authorization", `Bearer ${project.token}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toContain(
          "This endpoint requires a personal access token.",
        );
      });
  });
});
