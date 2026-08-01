import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { AutomationRule, DiscordWebhook } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const CreateAutomationRuleMutation = `
  mutation CreateAutomationRule($input: CreateAutomationRuleInput!) {
    createAutomationRule(input: $input) {
      id
      then {
        action
        actionPayload
      }
    }
  }
`;

const AutomationRuleQuery = `
  query AutomationRule($id: String!) {
    automationRule(id: $id) {
      id
      then {
        action
        actionPayload
      }
    }
  }
`;

async function createTeamOwner() {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  invariant(userAccount.userId, "user account has no user");

  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");

  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: userAccount.userId,
    userLevel: "owner",
  });

  return { userAccount, teamAccount, user: userAccount.user };
}

describe("GraphQL Discord automation", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("preserves the order of mixed Slack, Teams and Discord actions", async () => {
    const { userAccount, teamAccount, user } = await createTeamOwner();
    const project = await factory.Project.create({ accountId: teamAccount.id });

    const slackInstallation = await factory.SlackInstallation.create();
    await teamAccount
      .$query()
      .patch({ slackInstallationId: slackInstallation.id });
    const slackChannel = await factory.SlackChannel.create({
      slackInstallationId: slackInstallation.id,
    });

    const [msTeamsWebhook, discordWebhook] = await Promise.all([
      factory.MsTeamsWebhook.create({ accountId: teamAccount.id }),
      factory.DiscordWebhook.create({ accountId: teamAccount.id }),
    ]);

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CreateAutomationRuleMutation,
        variables: {
          input: {
            projectId: project.id,
            name: "mixed order",
            events: ["build.completed"],
            conditions: [],
            // Discord is deliberately sandwiched between the other two.
            actions: [
              {
                type: "sendMsTeamsMessage",
                payload: { webhookId: msTeamsWebhook.id },
              },
              {
                type: "sendDiscordMessage",
                payload: { webhookId: discordWebhook.id },
              },
              {
                type: "sendSlackMessage",
                payload: { slackId: slackChannel.slackId, name: "whatever" },
              },
            ],
          },
        },
      });

    expectNoGraphQLError(res);

    const rule = await AutomationRule.query()
      .findById(res.body.data.createAutomationRule.id)
      .throwIfNotFound();

    expect(rule.then).toEqual([
      {
        action: "sendMsTeamsMessage",
        actionPayload: { webhookId: msTeamsWebhook.id },
      },
      {
        action: "sendDiscordMessage",
        actionPayload: { webhookId: discordWebhook.id },
      },
      {
        action: "sendSlackMessage",
        actionPayload: { channelId: slackChannel.slackId },
      },
    ]);
  });

  it("keeps the dangling id when the webhook has been deleted", async () => {
    const { userAccount, teamAccount, user } = await createTeamOwner();
    const project = await factory.Project.create({ accountId: teamAccount.id });
    const webhook = await factory.DiscordWebhook.create({
      accountId: teamAccount.id,
    });

    const rule = await factory.AutomationRule.create({
      projectId: project.id,
      then: [
        {
          action: "sendDiscordMessage",
          actionPayload: { webhookId: webhook.id },
        },
      ],
    });

    await DiscordWebhook.query().deleteById(webhook.id);

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({ query: AutomationRuleQuery, variables: { id: rule.id } });

    expectNoGraphQLError(res);

    // Blanking `webhookId` here would fail the frontend form schema
    // (`min(1)`) and make the edit page throw, leaving the rule unrepairable.
    expect(res.body.data.automationRule.then[0].actionPayload).toEqual({
      webhookId: webhook.id,
      name: "deleted",
    });
  });

  it("rejects a webhook belonging to another account", async () => {
    const { userAccount, teamAccount, user } = await createTeamOwner();
    const project = await factory.Project.create({ accountId: teamAccount.id });
    const otherAccount = await factory.TeamAccount.create();
    const foreignWebhook = await factory.DiscordWebhook.create({
      accountId: otherAccount.id,
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CreateAutomationRuleMutation,
        variables: {
          input: {
            projectId: project.id,
            name: "foreign webhook",
            events: ["build.completed"],
            conditions: [],
            actions: [
              {
                type: "sendDiscordMessage",
                payload: { webhookId: foreignWebhook.id },
              },
            ],
          },
        },
      });

    expect(res.body.errors[0].message).toMatch(/Discord webhook not found/);
    expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
  });
});
