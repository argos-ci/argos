import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { Account, type TeamUser } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createApolloServerApp } from "./util";

const UpdateAccountMutation = `
  mutation UpdateAccount($input: UpdateAccountInput!) {
    updateAccount(input: $input) {
      id
      name
      meteredSpendLimitByPeriod
    }
  }
`;

async function updateTeamAs(
  userLevel: TeamUser["userLevel"],
  input: Record<string, unknown>,
) {
  const [userAccount, teamAccount] = await Promise.all([
    factory.UserAccount.create(),
    factory.TeamAccount.create({ name: "Acme" }),
  ]);
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  invariant(teamAccount.teamId, "team account has no team");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: userAccount.user.id,
    userLevel,
  });
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    { user: userAccount.user, account: userAccount },
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: UpdateAccountMutation,
      variables: { input: { id: teamAccount.id, ...input } },
    });
  const updated = await Account.query()
    .findById(teamAccount.id)
    .throwIfNotFound();
  return { res, updated };
}

describe("GraphQL updateAccount", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it.each(["owner", "billing"] as const)(
    "lets a %s set the spend limit",
    async (userLevel) => {
      const { res, updated } = await updateTeamAs(userLevel, {
        meteredSpendLimitByPeriod: 100,
        blockWhenSpendLimitIsReached: true,
      });
      expect(res.body.errors).toBeUndefined();
      expect(updated.meteredSpendLimitByPeriod).toBe(100);
      expect(updated.blockWhenSpendLimitIsReached).toBe(true);
    },
  );

  it.each([
    { userLevel: "member", input: { meteredSpendLimitByPeriod: 100 } },
    { userLevel: "billing", input: { name: "Renamed" } },
    // The spend limit does not carry the settings beside it through.
    {
      userLevel: "billing",
      input: { meteredSpendLimitByPeriod: 100, name: "Renamed" },
    },
    { userLevel: "billing", input: {} },
  ] as const)(
    "refuses a $userLevel updating $input",
    async ({ userLevel, input }) => {
      const { res, updated } = await updateTeamAs(userLevel, input);
      expect(res.body.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
      expect(updated.name).toBe("Acme");
      expect(updated.meteredSpendLimitByPeriod).toBeNull();
    },
  );
});
