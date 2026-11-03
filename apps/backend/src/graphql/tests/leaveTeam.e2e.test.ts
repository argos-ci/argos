import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { TeamUser } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const LeaveTeamMutation = `
  mutation LeaveTeam($teamAccountId: ID!) {
    leaveTeam(input: { teamAccountId: $teamAccountId })
  }
`;

async function createUser() {
  const account = await factory.UserAccount.create();
  await account.$fetchGraph("user");
  invariant(account.user, "user not fetched");
  return { account, user: account.user };
}

async function leaveTeam(
  viewer: Awaited<ReturnType<typeof createUser>>,
  teamAccountId: string,
) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    viewer,
  );
  return request(app)
    .post("/graphql")
    .send({ query: LeaveTeamMutation, variables: { teamAccountId } });
}

describe("GraphQL leaveTeam", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("refuses someone who is not a member, leaving every level as it was", async () => {
    // Leaving a team of two promotes whoever is left alone; a non-member
    // removing nobody must not get there, or it would make a contributor owner.
    const [owner, contributor, outsider] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
    ]);
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId, "team account has no team");
    await factory.TeamUser.createMany(2, [
      { teamId: teamAccount.teamId, userId: owner.user.id, userLevel: "owner" },
      {
        teamId: teamAccount.teamId,
        userId: contributor.user.id,
        userLevel: "contributor",
      },
    ]);

    const res = await leaveTeam(outsider, teamAccount.id);

    expect(res.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(
      await TeamUser.query().findOne({
        teamId: teamAccount.teamId,
        userId: contributor.user.id,
      }),
    ).toMatchObject({ userLevel: "contributor" });
  });

  it("makes the member left alone the owner", async () => {
    const [owner, contributor] = await Promise.all([
      createUser(),
      createUser(),
    ]);
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId, "team account has no team");
    await factory.TeamUser.createMany(2, [
      { teamId: teamAccount.teamId, userId: owner.user.id, userLevel: "owner" },
      {
        teamId: teamAccount.teamId,
        userId: contributor.user.id,
        userLevel: "contributor",
      },
    ]);

    const res = await leaveTeam(owner, teamAccount.id);

    expectNoGraphQLError(res);
    expect(
      await TeamUser.query().where({ teamId: teamAccount.teamId }),
    ).toMatchObject([{ userId: contributor.user.id, userLevel: "owner" }]);
  });
});
