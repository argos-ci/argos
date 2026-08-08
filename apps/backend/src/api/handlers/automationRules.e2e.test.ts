import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  Account,
  AutomationRule,
  DiscordWebhook,
  Project,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import {
  createAutomationRule,
  deactivateAutomationRule,
  getAutomationRule,
  listAutomationRules,
  updateAutomationRule,
} from "./automationRules";

const app = createTestHandlerApp(
  listAutomationRules,
  getAutomationRule,
  createAutomationRule,
  updateAutomationRule,
  deactivateAutomationRule,
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
  webhook: DiscordWebhook;
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
  webhook: async ({ account }, use) => {
    const webhook = await factory.DiscordWebhook.create({
      accountId: account.id,
    });
    await use(webhook);
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

/** A valid rule body targeting the fixture's Discord webhook. */
function ruleBody(webhook: DiscordWebhook, overrides: object = {}) {
  return {
    name: "Notify on failures",
    events: ["build.completed"],
    conditions: [{ type: "build-conclusion", value: "changes-detected" }],
    actions: [
      { type: "sendDiscordMessage", payload: { webhookId: webhook.id } },
    ],
    ...overrides,
  };
}

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("createAutomationRule", () => {
  test("creates a rule", async ({ project, webhook, token }) => {
    const res = await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(webhook))
      .expect(201);

    expect(res.body).toMatchObject({
      name: "Notify on failures",
      active: true,
      events: ["build.completed"],
      conditions: [{ type: "build-conclusion", value: "changes-detected" }],
    });
    // The action's target is resolved and stored, not echoed back as input.
    expect(res.body.actions).toEqual([
      {
        action: "sendDiscordMessage",
        actionPayload: { webhookId: webhook.id },
      },
    ]);

    const rule = await AutomationRule.query().findById(res.body.id);
    expect(rule?.projectId).toBe(project.id);
  });

  test("400s on an unknown event", async ({ webhook, token }) => {
    await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(webhook, { events: ["build.exploded"] }))
      .expect(400);
  });

  test("400s on an empty action list", async ({ token }) => {
    await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Nothing to do",
        events: ["build.completed"],
        conditions: [],
        actions: [],
      })
      .expect(400);
  });

  test("400s on a malformed condition", async ({ webhook, token }) => {
    await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(webhook, { conditions: [{ type: "phase-of-the-moon" }] }))
      .expect(400);
  });

  test("refuses a webhook from another account", async ({ token }) => {
    const otherAccount = await factory.TeamAccount.create({ slug: "other" });
    const otherWebhook = await factory.DiscordWebhook.create({
      accountId: otherAccount.id,
    });

    const res = await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(otherWebhook))
      .expect(400);

    expect(res.body.error).toMatch(/webhook not found/i);
  });

  test("403s when the user is not a project admin", async ({
    account,
    project,
    webhook,
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
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(webhook))
      .expect(403);

    expect(
      await AutomationRule.query()
        .where({ projectId: project.id })
        .resultSize(),
    ).toBe(0);
  });
});

describe("listAutomationRules / getAutomationRule", () => {
  test("lists and reads back a rule", async ({ webhook, token }) => {
    const created = await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(webhook))
      .expect(201);

    const list = await request(app)
      .get("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body.pageInfo.total).toBe(1);

    const one = await request(app)
      .get(`/projects/acme/web/automation-rules/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(one.body.id).toBe(created.body.id);
  });

  test("404s on a non-numeric rule id", async ({ token }) => {
    // The id column is a bigint: without a guard this reaches Postgres and
    // comes back as a 500 carrying the query text.
    const res = await request(app)
      .get("/projects/acme/web/automation-rules/not-a-number")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(res.body.error).toBe("Automation rule not found.");
  });

  test("404s for a rule belonging to another project", async ({
    account,
    webhook,
    token,
  }) => {
    const created = await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(webhook))
      .expect(201);
    await factory.Project.create({ name: "other", accountId: account.id });

    // The rule exists and the caller administers both projects, but it is not
    // this project's rule.
    await request(app)
      .get(`/projects/acme/other/automation-rules/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  test("filters by active", async ({ webhook, token }) => {
    const created = await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(webhook))
      .expect(201);
    await request(app)
      .post(`/projects/acme/web/automation-rules/${created.body.id}/deactivate`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const active = await request(app)
      .get("/projects/acme/web/automation-rules?active=true")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(active.body.results).toHaveLength(0);

    const inactive = await request(app)
      .get("/projects/acme/web/automation-rules?active=false")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(inactive.body.results).toHaveLength(1);
  });
});

describe("updateAutomationRule", () => {
  test("replaces the definition", async ({ webhook, token }) => {
    const created = await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(webhook))
      .expect(201);

    const res = await request(app)
      .put(`/projects/acme/web/automation-rules/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(
        ruleBody(webhook, {
          name: "Notify on review",
          events: ["build.reviewed"],
          conditions: [],
        }),
      )
      .expect(200);

    expect(res.body).toMatchObject({
      name: "Notify on review",
      events: ["build.reviewed"],
      conditions: [],
    });
  });
});

describe("deactivateAutomationRule", () => {
  test("deactivates without deleting", async ({ webhook, token }) => {
    const created = await request(app)
      .post("/projects/acme/web/automation-rules")
      .set("Authorization", `Bearer ${token}`)
      .send(ruleBody(webhook))
      .expect(201);

    const res = await request(app)
      .post(`/projects/acme/web/automation-rules/${created.body.id}/deactivate`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.active).toBe(false);
    const rule = await AutomationRule.query().findById(created.body.id);
    invariant(rule, "the rule is kept for its run history");
    expect(rule.active).toBe(false);
  });
});
