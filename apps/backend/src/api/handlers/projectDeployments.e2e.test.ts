import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  Account,
  Project,
  ProjectDomain,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import {
  getProjectDomain,
  listProjectDeployments,
  updateProjectDomain,
} from "./projectDeployments";

const app = createTestHandlerApp(
  listProjectDeployments,
  getProjectDomain,
  updateProjectDomain,
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
  // Lazy fixtures: every route below is project-scoped, so taking a token must
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

async function createDeployment(args: {
  project: Project;
  environment: "preview" | "production";
}) {
  return factory.Deployment.create({
    projectId: args.project.id,
    environment: args.environment,
  });
}

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("listProjectDeployments", () => {
  test("lists deployments, most recent first", async ({ project, token }) => {
    await createDeployment({ project, environment: "preview" });
    await createDeployment({ project, environment: "production" });

    const res = await request(app)
      .get("/projects/acme/web/deployments")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.pageInfo.total).toBe(2);
    expect(res.body.results[0]).toMatchObject({
      id: expect.any(String),
      environment: expect.any(String),
      branch: expect.any(String),
      url: expect.any(String),
    });
  });

  test("filters by environment", async ({ project, token }) => {
    await createDeployment({ project, environment: "preview" });
    await createDeployment({ project, environment: "production" });

    const res = await request(app)
      .get("/projects/acme/web/deployments?environment=production")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].environment).toBe("production");
  });

  test("400s on an unknown environment", async ({ token }) => {
    await request(app)
      .get("/projects/acme/web/deployments?environment=staging")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  test("does not leak another project's deployments", async ({
    account,
    token,
  }) => {
    const other = await factory.Project.create({
      name: "other",
      accountId: account.id,
    });
    await createDeployment({ project: other, environment: "production" });

    const res = await request(app)
      .get("/projects/acme/web/deployments")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.pageInfo.total).toBe(0);
  });
});

describe("project domain", () => {
  test("is null before one is set", async ({ token }) => {
    const res = await request(app)
      .get("/projects/acme/web/domain")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({ domain: null });
  });

  test("sets and reads back the domain", async ({ project, token }) => {
    const res = await request(app)
      .put("/projects/acme/web/domain")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme-web.dev.argos-ci.live" })
      .expect(200);

    expect(res.body.domain).toBe("acme-web.dev.argos-ci.live");

    const stored = await ProjectDomain.query().findOne({
      projectId: project.id,
      environment: "production",
    });
    expect(stored?.domain).toBe("acme-web.dev.argos-ci.live");

    const read = await request(app)
      .get("/projects/acme/web/domain")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(read.body.domain).toBe("acme-web.dev.argos-ci.live");
  });

  test("replaces an existing domain", async ({ project, token }) => {
    await request(app)
      .put("/projects/acme/web/domain")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme-web.dev.argos-ci.live" })
      .expect(200);

    await request(app)
      .put("/projects/acme/web/domain")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme-site.dev.argos-ci.live" })
      .expect(200);

    const domains = await ProjectDomain.query().where({
      projectId: project.id,
      environment: "production",
    });
    expect(domains).toHaveLength(1);
    expect(domains[0]?.domain).toBe("acme-site.dev.argos-ci.live");
  });

  test("400s on an invalid domain", async ({ token }) => {
    await request(app)
      .put("/projects/acme/web/domain")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "not a domain!" })
      .expect(400);
  });

  test("400s on a domain outside the Argos deployments domain", async ({
    token,
  }) => {
    const res = await request(app)
      .put("/projects/acme/web/domain")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme-web.example.com" })
      .expect(400);

    expect(res.body.error).toMatch(/internal domains/i);
  });

  test("403s when the user is not a project admin", async ({
    account,
    project,
  }) => {
    const contributor = await factory.User.create();
    await factory.UserAccount.create({ userId: contributor.id });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: contributor.id,
      userLevel: "contributor",
    });
    const token = await createScopedPatToken({
      user: contributor,
      account,
      token: `arp_${"f".repeat(36)}`,
    });

    await request(app)
      .put("/projects/acme/web/domain")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme-web.dev.argos-ci.live" })
      .expect(403);

    expect(
      await ProjectDomain.query().where({ projectId: project.id }).resultSize(),
    ).toBe(0);
  });
});
