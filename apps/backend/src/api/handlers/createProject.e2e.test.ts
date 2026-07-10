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
import { createProject } from "./createProject";

const app = createTestHandlerApp(createProject);

/**
 * Create a personal access token for `user` scoped to `account` and return the
 * plaintext token to send as a bearer.
 */
async function createScopedPatToken(input: {
  user: User;
  account: Account;
  token: string;
}): Promise<string> {
  const userAccessToken = await factory.UserAccessToken.create({
    userId: input.user.id,
    token: hashToken(input.token),
  });
  await UserAccessTokenScope.query().insert({
    userAccessTokenId: userAccessToken.id,
    accountId: input.account.id,
  });
  return input.token;
}

const test = base.extend<{
  user: User;
  account: Account;
  scopedPatToken: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    // A personal access token authenticates through the user's personal
    // account, so it must exist for the auth flow to resolve.
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
  scopedPatToken: async ({ user, account }, use) => {
    const token = await createScopedPatToken({
      user,
      account,
      token: `arp_${"e".repeat(36)}`,
    });
    await use(token);
  },
});

describe("createProject", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("creates a project and returns it", async ({
    account,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ name: "web", accountSlug: "acme" })
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      account: { id: account.id, slug: "acme" },
      name: "web",
      defaultBaseBranch: "main",
      hasRemoteContentAccess: false,
    });

    const project = await Project.query().findById(res.body.id);
    expect(project).toMatchObject({ name: "web", accountId: account.id });
  });

  test("trims whitespace around the name", async ({ scopedPatToken }) => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ name: "  web  ", accountSlug: "acme" })
      .expect(201);

    expect(res.body.name).toBe("web");
  });

  test("returns 401 without a valid token", async () => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", "Bearer invalid-token")
      .send({ name: "web", accountSlug: "acme" });
    expect(res.status).toBe(401);
  });

  test("returns 401 when the token is not scoped to the target account", async ({
    user,
    scopedPatToken,
  }) => {
    // `scopedPatToken` is scoped to "acme". Even though the user is an owner of
    // "other", the acme-scoped token must not be able to create a project there.
    const other = await factory.TeamAccount.create({ slug: "other" });
    await factory.TeamUser.create({
      teamId: other.teamId,
      userId: user.id,
      userLevel: "owner",
    });

    await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ name: "web", accountSlug: "other" })
      .expect(401);

    const project = await Project.query().findOne({ accountId: other.id });
    expect(project).toBeUndefined();
  });

  test("returns 401 when the account does not exist", async ({
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ name: "web", accountSlug: "ghost" });
    expect(res.status).toBe(401);
  });

  test("returns 403 when the user is not an admin of the account", async ({
    account,
  }) => {
    const member = await factory.User.create();
    await factory.UserAccount.create({ userId: member.id });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: member.id,
      userLevel: "member",
    });
    const memberToken = await createScopedPatToken({
      user: member,
      account,
      token: `arp_${"a".repeat(36)}`,
    });

    await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ name: "web", accountSlug: "acme" })
      .expect(403);

    const project = await Project.query().findOne({ accountId: account.id });
    expect(project).toBeUndefined();
  });

  test("returns 400 when the name is already used (case-insensitive)", async ({
    account,
    scopedPatToken,
  }) => {
    await factory.Project.create({ accountId: account.id, name: "web" });

    await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ name: "WEB", accountSlug: "acme" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Name is already used by another project");
      });
  });

  test("returns 400 when the name is reserved", async ({ scopedPatToken }) => {
    await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ name: "settings", accountSlug: "acme" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Name is reserved for internal usage");
      });
  });

  test("returns 400 when the name has invalid characters", async ({
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ name: "has spaces", accountSlug: "acme" });
    expect(res.status).toBe(400);
  });

  test("returns 400 when the name is missing", async ({ scopedPatToken }) => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ accountSlug: "acme" });
    expect(res.status).toBe(400);
  });

  test("returns 400 when the name is blank", async ({ scopedPatToken }) => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ name: "   ", accountSlug: "acme" });
    expect(res.status).toBe(400);
  });
});
