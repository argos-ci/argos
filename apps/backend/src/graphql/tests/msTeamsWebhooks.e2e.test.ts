import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const MsTeamsWebhooksQuery = `
  query MsTeamsWebhooks($accountSlug: String!) {
    account(slug: $accountSlug) {
      id
      msTeamsWebhooks {
        id
        name
        url
      }
    }
  }
`;

const WEBHOOK_URL =
  "https://prod-00.westeurope.logic.azure.com/workflows/wf-1/triggers/manual/paths/invoke?api-version=1&sig=s3cr3t";

/**
 * Create a team account with a Microsoft Teams webhook and a member of the
 * given level.
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

  await factory.MsTeamsWebhook.create({
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
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    { user: args.user, account: args.userAccount },
  );

  const res = await request(app)
    .post("/graphql")
    .send({
      query: MsTeamsWebhooksQuery,
      variables: { accountSlug: args.accountSlug },
    });

  expectNoGraphQLError(res);

  return res.body.data.account.msTeamsWebhooks;
}

describe("GraphQL MsTeamsWebhook.url", () => {
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

  it("obfuscates the signature for non-admins", async () => {
    const { user, userAccount, teamAccount } =
      await createTeamWithWebhook("member");

    const webhooks = await queryWebhooks({
      user,
      userAccount,
      accountSlug: teamAccount.slug,
    });

    // The signature grants posting rights to the channel: members see which
    // flow is connected, not the credential.
    expect(webhooks).toEqual([
      {
        id: expect.any(String),
        name: "engineering",
        url: WEBHOOK_URL.replace("s3cr3t", "***"),
      },
    ]);
  });
});
