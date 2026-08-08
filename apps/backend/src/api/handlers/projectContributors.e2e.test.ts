import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  Account,
  Project,
  ProjectUser,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import {
  listProjectContributors,
  removeProjectContributorHandler,
  setProjectContributor,
} from "./projectContributors";

const app = createTestHandlerApp(
  listProjectContributors,
  setProjectContributor,
  removeProjectContributorHandler,
);

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
  // `project` is a dependency, not a value used here: vitest fixtures are
  // lazy, and every route below is project-scoped, so taking a token must
  // bring the project into existence too.
  token: async ({ user, account, project: _project }, use) => {
    await use(
      await createScopedPatToken({
        user,
        account,
        token: `arp_${"e".repeat(36)}`,
      }),
    );
  },
});

/** A team contributor: the only role per-project access is meaningful for. */
async function createContributor(account: Account): Promise<Account> {
  const userAccount = await factory.UserAccount.create();
  invariant(userAccount.userId);
  await factory.TeamUser.create({
    teamId: account.teamId,
    userId: userAccount.userId,
    userLevel: "contributor",
  });
  return userAccount;
}

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("setProjectContributor", () => {
  test("grants access", async ({ account, project, token }) => {
    const contributor = await createContributor(account);

    const res = await request(app)
      .put(`/projects/acme/web/contributors/${contributor.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "reviewer" })
      .expect(200);

    expect(res.body).toMatchObject({
      level: "reviewer",
      user: { id: contributor.id },
    });
    const projectUser = await ProjectUser.query().findOne({
      projectId: project.id,
      userId: contributor.userId,
    });
    expect(projectUser?.userLevel).toBe("reviewer");
  });

  test("changes an existing level", async ({ account, project, token }) => {
    const contributor = await createContributor(account);
    const url = `/projects/acme/web/contributors/${contributor.id}`;

    await request(app)
      .put(url)
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "viewer" })
      .expect(200);

    const res = await request(app)
      .put(url)
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "admin" })
      .expect(200);

    expect(res.body.level).toBe("admin");
    expect(
      await ProjectUser.query().where({ projectId: project.id }).resultSize(),
    ).toBe(1);
  });

  test("400s on an unknown level", async ({ account, token }) => {
    const contributor = await createContributor(account);

    await request(app)
      .put(`/projects/acme/web/contributors/${contributor.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "overlord" })
      .expect(400);
  });

  test("404s on an unknown user", async ({ token }) => {
    await request(app)
      .put("/projects/acme/web/contributors/99999999")
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "viewer" })
      .expect(404);
  });

  test("403s when the caller is not a project admin", async ({
    account,
    project,
  }) => {
    const contributor = await createContributor(account);
    const other = await createContributor(account);
    invariant(contributor.userId);
    const contributorUser = await User.query().findById(contributor.userId);
    invariant(contributorUser);
    const token = await createScopedPatToken({
      user: contributorUser,
      account,
      token: `arp_${"f".repeat(36)}`,
    });

    await request(app)
      .put(`/projects/acme/web/contributors/${other.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "admin" })
      .expect(403);

    expect(
      await ProjectUser.query().where({ projectId: project.id }).resultSize(),
    ).toBe(0);
  });
});

describe("listProjectContributors", () => {
  test("lists them, caller first", async ({ account, token, user }) => {
    const contributor = await createContributor(account);
    await request(app)
      .put(`/projects/acme/web/contributors/${contributor.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "viewer" })
      .expect(200);
    // Grant the caller access too, so the ordering has something to do.
    const ownAccount = await Account.query().findOne({ userId: user.id });
    invariant(ownAccount);
    await request(app)
      .put(`/projects/acme/web/contributors/${ownAccount.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "admin" })
      .expect(200);

    const res = await request(app)
      .get("/projects/acme/web/contributors")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.pageInfo.total).toBe(2);
    expect(res.body.results[0].user.id).toBe(ownAccount.id);
  });

  test("returns an empty page when nobody is granted", async ({ token }) => {
    const res = await request(app)
      .get("/projects/acme/web/contributors")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      results: [],
      pageInfo: { total: 0, page: 1, perPage: 30 },
    });
  });
});

describe("removeProjectContributor", () => {
  test("revokes access", async ({ account, project, token }) => {
    const contributor = await createContributor(account);
    await request(app)
      .put(`/projects/acme/web/contributors/${contributor.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "viewer" })
      .expect(200);

    await request(app)
      .delete(`/projects/acme/web/contributors/${contributor.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    expect(
      await ProjectUser.query().where({ projectId: project.id }).resultSize(),
    ).toBe(0);
  });

  test("lets a contributor remove themselves", async ({
    account,
    project,
    token,
  }) => {
    const contributor = await createContributor(account);
    await request(app)
      .put(`/projects/acme/web/contributors/${contributor.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "viewer" })
      .expect(200);

    invariant(contributor.userId);
    const contributorUser = await User.query().findById(contributor.userId);
    invariant(contributorUser);
    const ownToken = await createScopedPatToken({
      user: contributorUser,
      account,
      token: `arp_${"9".repeat(36)}`,
    });

    // They are not a project admin, but removing yourself is always allowed.
    await request(app)
      .delete(`/projects/acme/web/contributors/${contributor.id}`)
      .set("Authorization", `Bearer ${ownToken}`)
      .expect(204);

    expect(
      await ProjectUser.query().where({ projectId: project.id }).resultSize(),
    ).toBe(0);
  });

  test("404s when the user has no access to revoke", async ({
    account,
    token,
  }) => {
    const contributor = await createContributor(account);

    await request(app)
      .delete(`/projects/acme/web/contributors/${contributor.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});
