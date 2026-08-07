import { invariant } from "@argos/util/invariant";
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
import { getProject } from "./getProject";
import { transferProject } from "./transferProject";
import { updateProject } from "./updateProject";

const app = createTestHandlerApp(updateProject, transferProject, getProject);

async function createScopedPatToken(input: {
  user: User;
  accounts: Account[];
  token: string;
}): Promise<string> {
  const userAccessToken = await factory.UserAccessToken.create({
    userId: input.user.id,
    token: hashToken(input.token),
  });
  for (const account of input.accounts) {
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });
  }
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
  token: async ({ user, account }, use) => {
    await use(
      await createScopedPatToken({
        user,
        accounts: [account],
        token: `arp_${"e".repeat(36)}`,
      }),
    );
  },
});

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("updateProject", () => {
  test("updates the given settings only", async ({ project, token }) => {
    const res = await request(app)
      .patch("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .send({ summaryCheck: "never", deploymentEnabled: false })
      .expect(200);

    expect(res.body).toMatchObject({
      name: "web",
      summaryCheck: "never",
      deploymentEnabled: false,
    });

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.summaryCheck).toBe("never");
    expect(reloaded?.deploymentEnabled).toBe(false);
    // Untouched settings keep their value.
    expect(reloaded?.prCommentEnabled).toBe(project.prCommentEnabled);
  });

  test("renames the project", async ({ project, token }) => {
    const res = await request(app)
      .patch("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "website" })
      .expect(200);

    expect(res.body.name).toBe("website");
    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.name).toBe("website");
  });

  test("400s on a name already used in the account", async ({
    account,
    project,
    token,
  }) => {
    expect(project.name).toBe("web");
    await factory.Project.create({ name: "taken", accountId: account.id });

    const res = await request(app)
      .patch("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "taken" })
      .expect(400);

    expect(res.body.error).toMatch(/already used/i);
  });

  test("400s on a reserved name", async ({ project, token }) => {
    expect(project.name).toBe("web");
    await request(app)
      .patch("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "settings" })
      .expect(400);
  });

  test("clears an override with null", async ({ project, token }) => {
    await project.$query().patch({ defaultBaseBranch: "develop" });

    await request(app)
      .patch("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .send({ defaultBaseBranch: null })
      .expect(200);

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.defaultBaseBranch).toBeNull();
  });

  test("writes the ignore config", async ({ project, token }) => {
    await request(app)
      .patch("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .send({ ignoreConfig: { enabled: true, autoIgnore: { changes: 7 } } })
      .expect(200);

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.$getIgnoreConfig()).toEqual({
      enabled: true,
      autoIgnore: { changes: 7 },
    });
  });

  test("400s on an unknown enum value", async ({ token }) => {
    await request(app)
      .patch("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .send({ summaryCheck: "sometimes" })
      .expect(400);
  });

  test("403s when the user is not an admin of the project", async ({
    user,
    account,
    project,
  }) => {
    // Team members hold every project permission, so the non-admin case is a
    // contributor the project grants no default level to.
    const outsider = await factory.User.create();
    await factory.UserAccount.create({ userId: outsider.id });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: outsider.id,
      userLevel: "contributor",
    });
    const token = await createScopedPatToken({
      user: outsider,
      accounts: [account],
      token: `arp_${"f".repeat(36)}`,
    });

    await request(app)
      .patch("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .send({ summaryCheck: "never" })
      .expect(403);

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.summaryCheck).toBe(project.summaryCheck);
    expect(user.id).not.toBe(outsider.id);
  });

  test("401s when the token is not scoped to the account", async ({
    user,
    project,
  }) => {
    const other = await factory.TeamAccount.create({ slug: "other" });
    const token = await createScopedPatToken({
      user,
      accounts: [other],
      token: `arp_${"a".repeat(36)}`,
    });

    await request(app)
      .patch("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .send({ summaryCheck: "never" })
      .expect(401);

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.summaryCheck).toBe(project.summaryCheck);
  });

  test("rejects `private` on deployment auth outside a team", async ({
    user,
  }) => {
    const personal = await Account.query().findOne({ userId: user.id });
    invariant(personal);
    await factory.Project.create({ name: "solo", accountId: personal.id });
    const token = await createScopedPatToken({
      user,
      accounts: [personal],
      token: `arp_${"b".repeat(36)}`,
    });

    const res = await request(app)
      .patch(`/projects/${personal.slug}/solo`)
      .set("Authorization", `Bearer ${token}`)
      .send({ deploymentAuth: "private" })
      .expect(400);

    expect(res.body.error).toMatch(/requires a team/i);
  });
});

describe("getProject", () => {
  test("exposes the settings", async ({ project, token }) => {
    expect(project.name).toBe("web");
    const res = await request(app)
      .get("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      name: "web",
      summaryCheck: expect.any(String),
      deploymentAuth: expect.any(String),
      deploymentEnabled: expect.any(Boolean),
      prCommentEnabled: expect.any(Boolean),
      githubActionsOidcEnabled: expect.any(Boolean),
      tokenlessAuthEnabled: expect.any(Boolean),
      private: expect.any(Boolean),
      ignoreConfig: { enabled: expect.any(Boolean) },
    });
  });
});

describe("transferProject", () => {
  test("moves the project to another account", async ({
    user,
    account,
    project,
  }) => {
    const target = await factory.TeamAccount.create({ slug: "target" });
    await factory.TeamUser.create({
      teamId: target.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    const token = await createScopedPatToken({
      user,
      accounts: [account, target],
      token: `arp_${"c".repeat(36)}`,
    });

    const res = await request(app)
      .post("/projects/acme/web/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetAccountSlug: "target" })
      .expect(200);

    expect(res.body.account.slug).toBe("target");
    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.accountId).toBe(target.id);
    expect(reloaded?.name).toBe("web");
  });

  test("renames on the way", async ({ user, account, project }) => {
    const target = await factory.TeamAccount.create({ slug: "target" });
    await factory.TeamUser.create({
      teamId: target.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    const token = await createScopedPatToken({
      user,
      accounts: [account, target],
      token: `arp_${"d".repeat(36)}`,
    });

    await request(app)
      .post("/projects/acme/web/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetAccountSlug: "target", name: "renamed" })
      .expect(200);

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.name).toBe("renamed");
  });

  test("401s when the token is not scoped to the target", async ({
    user,
    account,
    project,
  }) => {
    const target = await factory.TeamAccount.create({ slug: "target" });
    await factory.TeamUser.create({
      teamId: target.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    // Scoped to the source only.
    const token = await createScopedPatToken({
      user,
      accounts: [account],
      token: `arp_${"9".repeat(36)}`,
    });

    await request(app)
      .post("/projects/acme/web/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetAccountSlug: "target" })
      .expect(401);

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.accountId).toBe(account.id);
  });

  test("403s when the user does not administer the target", async ({
    user,
    account,
    project,
  }) => {
    const target = await factory.TeamAccount.create({ slug: "target" });
    await factory.TeamUser.create({
      teamId: target.teamId,
      userId: user.id,
      userLevel: "member",
    });
    const token = await createScopedPatToken({
      user,
      accounts: [account, target],
      token: `arp_${"8".repeat(36)}`,
    });

    await request(app)
      .post("/projects/acme/web/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetAccountSlug: "target" })
      .expect(403);

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.accountId).toBe(account.id);
  });

  test("400s when the target already has a project with that name", async ({
    user,
    account,
    project,
  }) => {
    const target = await factory.TeamAccount.create({ slug: "target" });
    await factory.TeamUser.create({
      teamId: target.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    await factory.Project.create({ name: "web", accountId: target.id });
    const token = await createScopedPatToken({
      user,
      accounts: [account, target],
      token: `arp_${"7".repeat(36)}`,
    });

    await request(app)
      .post("/projects/acme/web/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetAccountSlug: "target" })
      .expect(400);

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.accountId).toBe(account.id);
  });

  test("400s when transferring to the owning account", async ({
    project,
    token,
  }) => {
    expect(project.name).toBe("web");
    await request(app)
      .post("/projects/acme/web/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetAccountSlug: "acme" })
      .expect(400);
  });
});
