import { invariant } from "@argos/util/invariant";
import express from "express";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import type { Account, Project, User } from "@/database/models";
import { ProjectUser, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import { PROJECT_TOKEN_PERMISSION_LIST } from "@/project-token/permissions";

import { openAPIRouter } from "../index";

// The full router: permission failures surface through the shared
// `errorHandler`, like they do in production.
const app = express();
app.use(openAPIRouter);

const COMMIT = "a".repeat(40);

async function createPat(input: {
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

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const test = base.extend<{
  team: Account;
  web: Project;
  docs: Project;
  ownerPat: string;
  /** A team contributor who administers `web` and nothing else. */
  contributorPat: string;
}>({
  team: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create({ slug: "acme" }));
  },
  web: async ({ team }, use) => {
    await use(
      await factory.Project.create({ accountId: team.id, name: "web" }),
    );
  },
  docs: async ({ team }, use) => {
    await use(
      await factory.Project.create({ accountId: team.id, name: "docs" }),
    );
  },
  ownerPat: async ({ team }, use) => {
    invariant(team.teamId);
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await factory.TeamUser.create({
      teamId: team.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    await use(
      await createPat({ user, account: team, token: `arp_${"o".repeat(36)}` }),
    );
  },
  contributorPat: async ({ team, web }, use) => {
    invariant(team.teamId);
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await factory.TeamUser.create({
      teamId: team.teamId,
      userId: user.id,
      userLevel: "contributor",
    });
    await ProjectUser.query().insert({
      projectId: web.id,
      userId: user.id,
      userLevel: "admin",
    });
    await use(
      await createPat({ user, account: team, token: `arp_${"c".repeat(36)}` }),
    );
  },
});

describe("project tokens", () => {
  test("rotates a project token without downtime", async ({
    web,
    ownerPat,
  }) => {
    const previous = await factory.createProjectToken({ projects: [web] });

    const created = await request(app)
      .post("/projects/acme/web/tokens")
      .set(bearer(ownerPat))
      .send({ name: "GitHub Actions" })
      .expect(201);
    expect(created.body).toMatchObject({
      name: "GitHub Actions",
      projects: ["web"],
      permissions: PROJECT_TOKEN_PERMISSION_LIST,
      expireAt: null,
      lastUsedAt: null,
    });
    // The SDK only accepts 40 characters.
    expect(created.body.token).toMatch(/^argos_[a-z1-9]{34}$/);

    // Until the old token is revoked, CI authenticates with either.
    for (const token of [previous.token, created.body.token]) {
      const res = await request(app).get("/project").set(bearer(token));
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("web");
    }

    const listed = await request(app)
      .get("/projects/acme/web/tokens")
      .set(bearer(ownerPat))
      .expect(200);
    expect(listed.body).toHaveLength(2);
    for (const token of listed.body) {
      expect(token).not.toHaveProperty("token");
    }

    await request(app)
      .delete(`/projects/acme/web/tokens/${previous.projectToken.id}`)
      .set(bearer(ownerPat))
      .expect(204);

    await request(app).get("/project").set(bearer(previous.token)).expect(401);
    await request(app)
      .get("/project")
      .set(bearer(created.body.token))
      .expect(200);
  });

  test("lets a project administrator manage the tokens of their project only", async ({
    web,
    docs,
    contributorPat,
  }) => {
    const created = await request(app)
      .post("/projects/acme/web/tokens")
      .set(bearer(contributorPat))
      .send({ name: "Web CI" })
      .expect(201);

    await request(app)
      .post("/projects/acme/docs/tokens")
      .set(bearer(contributorPat))
      .send({ name: "Docs CI" })
      .expect(403);

    // A token reaching docs too is not theirs to revoke, nor to learn about
    // docs from.
    const shared = await factory.createProjectToken({ projects: [web, docs] });
    const listed = await request(app)
      .get("/projects/acme/web/tokens")
      .set(bearer(contributorPat))
      .expect(200);
    expect(
      listed.body.find(
        (token: { id: string }) => token.id === shared.projectToken.id,
      )?.projects,
    ).toEqual(["web"]);
    await request(app)
      .delete(`/projects/acme/web/tokens/${shared.projectToken.id}`)
      .set(bearer(contributorPat))
      .expect(403);
    await request(app)
      .get("/project?project=acme/docs")
      .set(bearer(shared.token))
      .expect(200);

    await request(app)
      .get("/accounts/acme/project-tokens")
      .set(bearer(contributorPat))
      .expect(403);

    await request(app)
      .delete(`/projects/acme/web/tokens/${created.body.id}`)
      .set(bearer(contributorPat))
      .expect(204);
  });

  test("makes a token linked to several projects name the one it acts on", async ({
    web,
    docs,
    ownerPat,
  }) => {
    void web;
    void docs;
    const created = await request(app)
      .post("/accounts/acme/project-tokens")
      .set(bearer(ownerPat))
      .send({ name: "Monorepo", projects: ["web", "docs"] })
      .expect(201);
    expect(created.body.projects).toEqual(["docs", "web"]);
    const token: string = created.body.token;

    const ambiguous = await request(app).get("/project").set(bearer(token));
    expect(ambiguous.status).toBe(400);
    expect(ambiguous.body.error).toMatch(/ARGOS_PROJECT/);

    const named = await request(app)
      .get("/project?project=acme/docs")
      .set(bearer(token))
      .expect(200);
    expect(named.body.name).toBe("docs");

    await request(app)
      .post("/baseline")
      .set(bearer(token))
      .send({ project: "acme/web", commits: [COMMIT] })
      .expect(200);

    await request(app)
      .get("/project?project=acme/blog")
      .set(bearer(token))
      .expect(401);

    const listed = await request(app)
      .get("/accounts/acme/project-tokens")
      .set(bearer(ownerPat))
      .expect(200);
    expect(listed.body.map((token: { name: string }) => token.name)).toEqual([
      "Monorepo",
    ]);

    await request(app)
      .delete(`/accounts/acme/project-tokens/${created.body.id}`)
      .set(bearer(ownerPat))
      .expect(204);
    await request(app)
      .get("/project?project=acme/docs")
      .set(bearer(token))
      .expect(401);
  });

  test("limits a token to its permissions", async ({ web, ownerPat }) => {
    void web;
    const created = await request(app)
      .post("/projects/acme/web/tokens")
      .set(bearer(ownerPat))
      .send({ name: "Read only", permissions: ["projects:read"] })
      .expect(201);

    const res = await request(app)
      .post("/baseline")
      .set(bearer(created.body.token))
      .send({ commits: [COMMIT] });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe(
      "This project token lacks a permission. This endpoint requires: builds:write.",
    );

    // Reading the token's own project takes no permission: the SDK does it
    // before anything else.
    await request(app)
      .get("/project")
      .set(bearer(created.body.token))
      .expect(200);
  });

  test("rejects an expired token", async ({ web }) => {
    const { token } = await factory.createProjectToken({
      projects: [web],
      expireAt: new Date(Date.now() - 1000).toISOString(),
    });
    const res = await request(app).get("/project").set(bearer(token));
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/);
  });

  test("refuses an expiration date in the past", async ({ web, ownerPat }) => {
    void web;
    await request(app)
      .post("/projects/acme/web/tokens")
      .set(bearer(ownerPat))
      .send({
        name: "Already expired",
        expireAt: new Date(Date.now() - 1000).toISOString(),
      })
      .expect(400);
  });
});
