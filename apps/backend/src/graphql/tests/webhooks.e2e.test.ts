import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { describe, expect, test } from "vitest";

import {
  Webhook,
  WebhookDelivery,
  type Account,
  type Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const WebhooksQuery = `
  query Webhooks($slug: String!) {
    account(slug: $slug) {
      id
      webhooks {
        id
        url
        events
        allProjects
        projects { id }
        lastDelivery { id }
      }
    }
  }
`;

const CreateWebhookMutation = `
  mutation CreateWebhook($input: CreateWebhookInput!) {
    createWebhook(input: $input) {
      secret
      webhook { id url events allProjects projects { id } }
    }
  }
`;

const DeleteWebhookMutation = `
  mutation DeleteWebhook($input: DeleteWebhookInput!) {
    deleteWebhook(input: $input)
  }
`;

const DeliveriesQuery = `
  query Deliveries($slug: String!, $id: ID!, $status: WebhookDeliveryStatus, $deliveryId: ID!) {
    account(slug: $slug) {
      webhook(id: $id) {
        deliveries(status: $status) {
          edges { id status responseStatus event { id type } }
        }
        delivery(id: $deliveryId) {
          id
          responseBody
          event { id body }
        }
      }
    }
  }
`;

const ResendMutation = `
  mutation Resend($input: ResendWebhookDeliveryInput!) {
    resendWebhookDelivery(input: $input) { id status }
  }
`;

const URL = "https://example.com/hooks/argos";

type Fixtures = {
  team: Account;
  project: Project;
  /** Post a GraphQL request as an owner (admin) or a member of the team. */
  post: (as: "owner" | "member", body: object) => Promise<request.Response>;
};

const webhooksTest = test.extend<Fixtures>({
  team: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create());
  },
  project: async ({ team }, use) => {
    await use(await factory.Project.create({ accountId: team.id }));
  },
  post: async ({ team }, use) => {
    const { teamId } = team;
    invariant(teamId, "not a team account");
    const createApp = async (userLevel: "owner" | "member") => {
      const account = await factory.UserAccount.create();
      await account.$fetchGraph("user");
      invariant(account.user && account.userId, "user not fetched");
      await factory.TeamUser.create({
        teamId,
        userId: account.userId,
        userLevel,
      });
      return createApolloServerApp(apolloServer, createApolloMiddleware, {
        user: account.user,
        account,
      });
    };
    const apps = {
      owner: await createApp("owner"),
      member: await createApp("member"),
    };
    await use((as, body) => request(apps[as]).post("/graphql").send(body));
  },
});

describe("webhooks", () => {
  webhooksTest(
    "an admin creates a webhook and sees its secret once",
    async ({ team, project, post }) => {
      const created = await post("owner", {
        query: CreateWebhookMutation,
        variables: {
          input: {
            accountId: team.id,
            url: URL,
            events: ["build_completed", "build_reviewed"],
            projectIds: [project.id],
          },
        },
      });
      expectNoGraphQLError(created);
      const { secret, webhook } = created.body.data.createWebhook;
      expect(secret).toMatch(/^whsec_[A-Za-z0-9+/]{43}=$/);
      expect(webhook).toEqual({
        id: expect.any(String),
        url: URL,
        events: ["build_completed", "build_reviewed"],
        allProjects: false,
        projects: [{ id: project.id }],
      });

      const listed = await post("owner", {
        query: WebhooksQuery,
        variables: { slug: team.slug },
      });
      expectNoGraphQLError(listed);
      expect(listed.body.data.account.webhooks).toEqual([
        { ...webhook, lastDelivery: null },
      ]);
      // Only the creation response carries the secret.
      expect(JSON.stringify(listed.body)).not.toContain(secret);
    },
  );

  webhooksTest(
    "members can neither see nor create webhooks",
    async ({ team, post }) => {
      await factory.Webhook.create({ accountId: team.id });

      const listed = await post("member", {
        query: WebhooksQuery,
        variables: { slug: team.slug },
      });
      expectNoGraphQLError(listed);
      expect(listed.body.data.account.webhooks).toBeNull();

      const created = await post("member", {
        query: CreateWebhookMutation,
        variables: {
          input: { accountId: team.id, url: URL, events: ["build_completed"] },
        },
      });
      expect(created.body.errors?.[0]?.message).toBe(
        "Only administrators of the account can manage webhooks.",
      );
      expect(await Webhook.query().resultSize()).toBe(1);
    },
  );

  webhooksTest(
    "a webhook cannot cover a project of another account",
    async ({ team, post }) => {
      const otherProject = await factory.Project.create();

      const created = await post("owner", {
        query: CreateWebhookMutation,
        variables: {
          input: {
            accountId: team.id,
            url: URL,
            events: ["build_completed"],
            projectIds: [otherProject.id],
          },
        },
      });
      expect(created.body.errors?.[0]?.message).toBe("Project not found.");
      expect(await Webhook.query().resultSize()).toBe(0);
    },
  );

  webhooksTest("only an admin deletes a webhook", async ({ team, post }) => {
    const webhook = await factory.Webhook.create({ accountId: team.id });
    const body = {
      query: DeleteWebhookMutation,
      variables: { input: { id: webhook.id } },
    };

    const refused = await post("member", body);
    expect(refused.body.errors?.[0]?.message).toBe(
      "Only administrators of the account can manage webhooks.",
    );
    expect(await webhook.$query()).toBeDefined();

    const deleted = await post("owner", body);
    expectNoGraphQLError(deleted);
    expect(deleted.body.data.deleteWebhook).toBe(webhook.id);
    expect(await Webhook.query().findById(webhook.id)).toBeUndefined();
  });

  webhooksTest(
    "an admin lists deliveries, filters the failed ones and resends one",
    async ({ team, project, post }) => {
      const webhook = await factory.Webhook.create({ accountId: team.id });
      const event = await factory.ProjectEvent.create({
        projectId: project.id,
      });
      await factory.WebhookDelivery.create({
        webhookId: webhook.id,
        eventId: event.id,
      });
      const failed = await factory.WebhookDelivery.create({
        webhookId: webhook.id,
        eventId: event.id,
        attempts: 4,
        conclusion: "failed",
        responseStatus: 500,
        responseBody: "boom",
        failureReason: "Your endpoint responded with HTTP 500.",
      });

      const listed = await post("owner", {
        query: DeliveriesQuery,
        variables: {
          slug: team.slug,
          id: webhook.id,
          status: "failed",
          deliveryId: failed.id,
        },
      });
      expectNoGraphQLError(listed);
      const found = listed.body.data.account.webhook;
      expect(found.deliveries.edges).toEqual([
        {
          id: failed.id,
          status: "failed",
          responseStatus: 500,
          event: { id: event.id, type: "build_completed" },
        },
      ]);
      expect(found.delivery.responseBody).toBe("boom");
      expect(JSON.parse(found.delivery.event.body)).toMatchObject({
        id: event.id,
        type: "build.completed",
      });

      const resent = await post("owner", {
        query: ResendMutation,
        variables: { input: { id: failed.id } },
      });
      expectNoGraphQLError(resent);
      expect(resent.body.data.resendWebhookDelivery.status).toBe("pending");
      expect(
        await WebhookDelivery.query().findById(
          resent.body.data.resendWebhookDelivery.id,
        ),
      ).toMatchObject({ eventId: event.id, attempts: 0, conclusion: null });

      const asMember = await post("member", {
        query: DeliveriesQuery,
        variables: {
          slug: team.slug,
          id: webhook.id,
          deliveryId: failed.id,
        },
      });
      expectNoGraphQLError(asMember);
      expect(asMember.body.data.account.webhook).toBeNull();

      const memberResend = await post("member", {
        query: ResendMutation,
        variables: { input: { id: failed.id } },
      });
      expect(memberResend.body.errors?.[0]?.message).toBe(
        "Only administrators of the account can manage webhooks.",
      );
    },
  );
});
