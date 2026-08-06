import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { expectNoGraphQLError } from "../testing";
import { createGraphQLApp } from "./util";

const DiscordWebhooksQuery = `
  query DiscordWebhooks($accountSlug: String!) {
    account(slug: $accountSlug) {
      id
      discordWebhooks {
        id
        name
        url
      }
    }
  }
`;

const WEBHOOK_URL =
  "https://discord.com/api/webhooks/1234567890123456789/s3cr3t-token";

/**
 * Create a team account with a Discord webhook and a member of the given level.
 */
async function createTeamWithWebhook(userLevel: "owner" | "member") {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  invariant(userAccount.userId, "user account has no user");

  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");

  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: userAccount.userId,
    userLevel,
  });

  await factory.DiscordWebhook.create({
    accountId: teamAccount.id,
    name: "engineering",
    url: WEBHOOK_URL,
  });

  return { userAccount, teamAccount, user: userAccount.user };
}

async function queryWebhooks(args: {
  user: Awaited<ReturnType<typeof createTeamWithWebhook>>["user"];
  userAccount: Awaited<ReturnType<typeof createTeamWithWebhook>>["userAccount"];
  accountSlug: string;
}) {
  const app = createGraphQLApp({
    user: args.user,
    account: args.userAccount,
  });

  const res = await request(app)
    .post("/graphql")
    .send({
      query: DiscordWebhooksQuery,
      variables: { accountSlug: args.accountSlug },
    });

  expectNoGraphQLError(res);

  return res.body.data.account.discordWebhooks;
}

describe("GraphQL DiscordWebhook.url", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("returns the full URL to admins", async () => {
    const { user, userAccount, teamAccount } =
      await createTeamWithWebhook("owner");

    const webhooks = await queryWebhooks({
      user,
      userAccount,
      accountSlug: teamAccount.slug,
    });

    expect(webhooks).toEqual([
      { id: expect.any(String), name: "engineering", url: WEBHOOK_URL },
    ]);
  });

  it("obfuscates the token for non-admins", async () => {
    const { user, userAccount, teamAccount } =
      await createTeamWithWebhook("member");

    const webhooks = await queryWebhooks({
      user,
      userAccount,
      accountSlug: teamAccount.slug,
    });

    // The token grants posting rights to the channel: members see which
    // webhook is connected, not the credential.
    expect(webhooks).toEqual([
      {
        id: expect.any(String),
        name: "engineering",
        url: "https://discord.com/api/webhooks/1234567890123456789/***",
      },
    ]);
  });
});
