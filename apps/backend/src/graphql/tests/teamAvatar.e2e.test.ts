import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createApolloServerApp } from "./util";

const SET_AVATAR = `
  mutation ($id: ID!, $uploadKey: String!) {
    setTeamAvatar(input: { teamAccountId: $id, uploadKey: $uploadKey }) { id }
  }
`;

const REMOVE_AVATAR = `
  mutation ($id: ID!) {
    removeTeamAvatar(input: { teamAccountId: $id }) { id }
  }
`;

async function createTeamWithViewer(userLevel: "owner" | "member") {
  const teamAccount = await factory.TeamAccount.create({
    avatarKey: "avatars/1/existing.png",
  });
  invariant(teamAccount.teamId, "team account has no team");
  const viewerAccount = await factory.UserAccount.create();
  const { user } = await viewerAccount.$fetchGraph("user");
  invariant(user, "user not fetched");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: user.id,
    userLevel,
  });
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    { user, account: viewerAccount },
  );
  return { teamAccount, user, app };
}

describe("GraphQL team avatar", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("is changed by team admins only", async () => {
    const { teamAccount, user, app } = await createTeamWithViewer("member");
    const variables = {
      id: teamAccount.id,
      uploadKey: `uploads/${user.id}/00000000-0000-0000-0000-000000000000`,
    };

    for (const query of [SET_AVATAR, REMOVE_AVATAR]) {
      const res = await request(app)
        .post("/graphql")
        .send({ query, variables });
      expect(res.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    }
    const unchanged = await Account.query().findById(teamAccount.id);
    expect(unchanged?.avatarKey).toBe("avatars/1/existing.png");
  });

  it("is never set from an upload made by another user", async () => {
    const { teamAccount, app } = await createTeamWithViewer("owner");
    const otherUser = await factory.User.create();

    const res = await request(app)
      .post("/graphql")
      .send({
        query: SET_AVATAR,
        variables: {
          id: teamAccount.id,
          uploadKey: `uploads/${otherUser.id}/00000000-0000-0000-0000-000000000000`,
        },
      });

    expect(res.body.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    const unchanged = await Account.query().findById(teamAccount.id);
    expect(unchanged?.avatarKey).toBe("avatars/1/existing.png");
  });
});
