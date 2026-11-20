import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import {
  UserAccessTokenScope,
  Webhook,
  WebhookDelivery,
  type Account,
  type Project,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import {
  createAccountWebhookHandler,
  deleteAccountWebhookHandler,
  getAccountWebhookHandler,
  getWebhookDeliveryHandler,
  listAccountWebhooksHandler,
  listWebhookDeliveriesHandler,
  resendWebhookDeliveryHandler,
} from "./webhooks";

const app = createTestHandlerApp(
  listAccountWebhooksHandler,
  createAccountWebhookHandler,
  getAccountWebhookHandler,
  deleteAccountWebhookHandler,
  listWebhookDeliveriesHandler,
  getWebhookDeliveryHandler,
  resendWebhookDeliveryHandler,
);

const URL = "https://hooks.example.com/argos";

const test = base.extend<{
  account: Account;
  project: Project;
  /** Send a request as an owner (admin) or a member of the team. */
  call: (
    as: "owner" | "member",
    method: "get" | "post" | "delete",
    path: string,
    body?: object,
  ) => Promise<request.Response>;
}>({
  account: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create({ slug: "acme" }));
  },
  project: async ({ account }, use) => {
    await use(
      await factory.Project.create({ accountId: account.id, name: "web" }),
    );
  },
  call: async ({ account }, use) => {
    const { teamId } = account;
    invariant(teamId, "not a team account");
    const tokens = Object.fromEntries(
      await Promise.all(
        (["owner", "member"] as const).map(async (userLevel) => {
          const user = await factory.User.create();
          await factory.UserAccount.create({ userId: user.id });
          await factory.TeamUser.create({ teamId, userId: user.id, userLevel });
          const token = `arp_${userLevel.padEnd(36, "x")}`;
          const userAccessToken = await factory.UserAccessToken.create({
            userId: user.id,
            token: hashToken(token),
          });
          await UserAccessTokenScope.query().insert({
            userAccessTokenId: userAccessToken.id,
            accountId: account.id,
          });
          return [userLevel, token];
        }),
      ),
    );
    await use((as, method, path, body) => {
      const req = request(app)
        [method](`/accounts/acme${path}`)
        .set("Authorization", `Bearer ${tokens[as]}`);
      return body ? req.send(body) : req;
    });
  },
});

describe("webhooks API", () => {
  test("an admin creates, lists, gets and deletes a webhook", async ({
    project,
    call,
  }) => {
    const created = await call("owner", "post", "/webhooks", {
      url: URL,
      events: ["build.completed", "deployment.ready"],
      projects: [project.name],
    });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      url: URL,
      events: ["build.completed", "deployment.ready"],
      projects: ["web"],
      createdAt: expect.any(String),
      secret: expect.stringMatching(/^whsec_[A-Za-z0-9+/]{43}=$/),
    });
    const { secret, ...webhook } = created.body;

    const listed = await call("owner", "get", "/webhooks");
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([webhook]);
    expect(JSON.stringify(listed.body)).not.toContain(secret);

    const fetched = await call("owner", "get", `/webhooks/${webhook.id}`);
    expect(fetched.body).toEqual(webhook);

    const deleted = await call("owner", "delete", `/webhooks/${webhook.id}`);
    expect(deleted.status).toBe(204);
    expect((await call("owner", "get", `/webhooks/${webhook.id}`)).status).toBe(
      404,
    );
  });

  test("covers every project by default", async ({ call }) => {
    const created = await call("owner", "post", "/webhooks", {
      url: URL,
      events: ["build.completed"],
    });
    expect(created.status).toBe(201);
    expect(created.body.projects).toBeNull();
  });

  test("refuses members, unknown projects and invalid URLs", async ({
    account,
    call,
  }) => {
    const webhook = await factory.Webhook.create({ accountId: account.id });

    for (const res of [
      await call("member", "get", "/webhooks"),
      await call("member", "get", `/webhooks/${webhook.id}`),
      await call("member", "post", "/webhooks", {
        url: URL,
        events: ["build.completed"],
      }),
    ]) {
      expect(res.status).toBe(403);
    }

    const unknownProject = await call("owner", "post", "/webhooks", {
      url: URL,
      events: ["build.completed"],
      projects: ["nope"],
    });
    expect(unknownProject.status).toBe(404);
    expect(unknownProject.body.error).toBe("Project not found: nope.");

    const withCredentials = await call("owner", "post", "/webhooks", {
      url: "https://user:pass@hooks.example.com/argos",
      events: ["build.completed"],
    });
    expect(withCredentials.status).toBe(400);
    expect(await Webhook.query().resultSize()).toBe(1);
  });

  test("lists deliveries, filters the failed ones, gets one and resends it", async ({
    account,
    project,
    call,
  }) => {
    const webhook = await factory.Webhook.create({ accountId: account.id });
    const event = await factory.ProjectEvent.create({ projectId: project.id });
    const [, failed] = await WebhookDelivery.query().insert([
      {
        webhookId: webhook.id,
        eventId: event.id,
        jobStatus: "complete",
        attempts: 1,
        conclusion: "success",
        responseStatus: 200,
      },
      {
        webhookId: webhook.id,
        eventId: event.id,
        jobStatus: "complete",
        attempts: 4,
        conclusion: "failed",
        responseStatus: 500,
        responseBody: "boom",
        failureReason: "Your endpoint responded with HTTP 500.",
      },
    ]);
    invariant(failed);
    const deliveries = `/webhooks/${webhook.id}/deliveries`;

    const listed = await call("owner", "get", `${deliveries}?status=failed`);
    expect(listed.status).toBe(200);
    expect(listed.body).toMatchObject({
      pageInfo: { total: 1, page: 1 },
      results: [
        {
          id: failed.id,
          status: "failed",
          eventId: event.id,
          eventType: "build.completed",
          attempts: 4,
          responseStatus: 500,
        },
      ],
    });

    const detail = await call("owner", "get", `${deliveries}/${failed.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: failed.id,
      responseBody: "boom",
      event: { id: event.id, type: "build.completed" },
    });

    const resent = await call(
      "owner",
      "post",
      `${deliveries}/${failed.id}/resend`,
    );
    expect(resent.status).toBe(201);
    expect(resent.body).toMatchObject({
      status: "pending",
      eventId: event.id,
      attempts: 0,
    });

    expect(
      (await call("member", "post", `${deliveries}/${failed.id}/resend`))
        .status,
    ).toBe(403);
  });
});
