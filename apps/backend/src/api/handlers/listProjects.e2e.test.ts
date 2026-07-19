import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  Account,
  Project,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { listProjects } from "./listProjects";

const app = createTestHandlerApp(listProjects);

const test = base.extend<{
  user: User;
  teamAccount: Account;
  projects: Project[];
  patToken: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await use(user);
  },
  teamAccount: async ({ user }, use) => {
    const teamAccount = await factory.TeamAccount.create({ slug: "acme" });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: user.id,
      userLevel: "member",
    });
    await use(teamAccount);
  },
  projects: async ({ teamAccount }, use) => {
    const projects = await factory.Project.createMany(2, [
      { accountId: teamAccount.id, name: "web" },
      { accountId: teamAccount.id, name: "mobile" },
    ]);
    await use(projects);
  },
  patToken: async ({ user, teamAccount }, use) => {
    const token = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: teamAccount.id,
    });
    await use(token);
  },
});

describe("listProjects", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("lists the account's projects, paginated", async ({
    projects,
    patToken,
  }) => {
    await request(app)
      .get("/accounts/acme/projects")
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.pageInfo).toEqual({ total: 2, page: 1, perPage: 30 });
        expect(
          res.body.results.map((project: { name: string }) => project.name),
        ).toEqual(expect.arrayContaining(["web", "mobile"]));
        const [first] = res.body.results;
        expect(first).toMatchObject({
          id: expect.any(String),
          account: { slug: "acme" },
        });
        void projects;
      });
  });

  test("paginates with page and perPage", async ({
    projects: _projects,
    patToken,
  }) => {
    const res = await request(app)
      .get("/accounts/acme/projects?perPage=1&page=2")
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);
    expect(res.body.pageInfo).toEqual({ total: 2, page: 2, perPage: 1 });
    expect(res.body.results).toHaveLength(1);
  });

  test("hides projects a contributor cannot see", async ({
    teamAccount,
    projects,
    patToken: _patToken,
  }) => {
    // A contributor with no project membership and no default level sees
    // nothing — the same visibility rules as the GraphQL API.
    const contributor = await factory.User.create();
    await factory.UserAccount.create({ userId: contributor.id });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: contributor.id,
      userLevel: "contributor",
    });
    const token = `arp_${"c".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: contributor.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: teamAccount.id,
    });

    const res = await request(app)
      .get("/accounts/acme/projects")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.pageInfo.total).toBe(0);
    expect(res.body.results).toEqual([]);
    void projects;
  });

  test("returns 401 for an account outside the token scope", async ({
    projects: _projects,
    patToken,
  }) => {
    await factory.TeamAccount.create({ slug: "other" });
    await request(app)
      .get("/accounts/other/projects")
      .set("Authorization", `Bearer ${patToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toContain(
          "You do not have access to this account",
        );
      });
  });
});
