import { invariant } from "@argos/util/invariant";
import { test as base, describe, expect } from "vitest";

import {
  Account,
  Team,
  UserAccessToken,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { getAuthPayloadFromUserAccessToken } from "./user-access-token";

const test = base.extend<{
  user: Awaited<ReturnType<typeof factory.User.create>>;
  userAccount: Awaited<ReturnType<typeof factory.UserAccount.create>>;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  userAccount: async ({ user }, use) => {
    const userAccount = await factory.UserAccount.create({
      userId: user.id,
    });
    await use(userAccount);
  },
});

async function createUserAccessToken(args: {
  userId: string;
  expireAt?: string | null;
}) {
  const token = UserAccessToken.generateToken();
  const userAccessToken = await UserAccessToken.query().insertAndFetch({
    userId: args.userId,
    name: "token-1",
    token: hashToken(token),
    source: "user",
    expireAt: args.expireAt ?? null,
    lastUsedAt: null,
  });

  return { token, userAccessToken };
}

async function addScope(args: {
  userAccessTokenId: string;
  accountId: string;
}) {
  await UserAccessTokenScope.query().insert(args);
}

async function createTeamAccount(args: { slug: string; name: string }) {
  const team = await Team.query().insertAndFetch({
    defaultUserLevel: "member",
  });

  return Account.query().insertAndFetch({
    teamId: team.id,
    slug: args.slug,
    name: args.name,
  });
}

describe("getAuthPayloadFromUserAccessToken", () => {
  test("throws when the token format is invalid", async () => {
    await expect(
      getAuthPayloadFromUserAccessToken("invalid-token"),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid user access token",
    });
  });

  test("throws when the token is not found", async ({ user }) => {
    void user;

    await expect(
      getAuthPayloadFromUserAccessToken(UserAccessToken.generateToken()),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Access token not found",
    });
  });

  test("throws when the token is expired", async ({ user }) => {
    const { token } = await createUserAccessToken({
      userId: user.id,
      expireAt: "2010-01-01T00:00:00.000Z",
    });

    await expect(
      getAuthPayloadFromUserAccessToken(token),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Personal access token has expired",
    });
  });

  test("returns the auth payload with only valid scope accounts and updates lastUsedAt", async ({
    user,
    userAccount,
  }) => {
    const teamAccount = await createTeamAccount({
      slug: "team-account",
      name: "Team Account",
    });
    invariant(teamAccount.teamId);
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: user.id,
      userLevel: "member",
    });

    const otherUser = await factory.User.create();
    const otherUserAccount = await factory.UserAccount.create({
      userId: otherUser.id,
    });
    const otherTeamAccount = await createTeamAccount({
      slug: "other-team-account",
      name: "Other Team Account",
    });

    const { token, userAccessToken } = await createUserAccessToken({
      userId: user.id,
    });

    await Promise.all([
      addScope({
        userAccessTokenId: userAccessToken.id,
        accountId: userAccount.id,
      }),
      addScope({
        userAccessTokenId: userAccessToken.id,
        accountId: teamAccount.id,
      }),
      addScope({
        userAccessTokenId: userAccessToken.id,
        accountId: otherUserAccount.id,
      }),
      addScope({
        userAccessTokenId: userAccessToken.id,
        accountId: otherTeamAccount.id,
      }),
    ]);

    const payload = await getAuthPayloadFromUserAccessToken(token);

    expect(payload).toMatchObject({
      type: "pat",
      account: { id: userAccount.id },
      user: {
        id: user.id,
        account: { id: userAccount.id },
        teams: [{ id: teamAccount.teamId }],
      },
      scope: [{ id: userAccount.id }, { id: teamAccount.id }],
    });

    const updatedUserAccessToken = await UserAccessToken.query().findById(
      userAccessToken.id,
    );
    expect(updatedUserAccessToken?.lastUsedAt).not.toBeNull();
  });

  test("throws when no scope account remains valid for the user", async ({
    user,
    userAccount,
  }) => {
    void userAccount;

    const otherUser = await factory.User.create();
    const otherUserAccount = await factory.UserAccount.create({
      userId: otherUser.id,
    });
    const otherTeamAccount = await createTeamAccount({
      slug: "other-team-account",
      name: "Other Team Account",
    });

    const { token, userAccessToken } = await createUserAccessToken({
      userId: user.id,
    });

    await Promise.all([
      addScope({
        userAccessTokenId: userAccessToken.id,
        accountId: otherUserAccount.id,
      }),
      addScope({
        userAccessTokenId: userAccessToken.id,
        accountId: otherTeamAccount.id,
      }),
    ]);

    await expect(
      getAuthPayloadFromUserAccessToken(token),
    ).rejects.toMatchObject({
      statusCode: 401,
      message:
        "This token has no valid scope, probably because you are not anymore in the team that was in the scope, please generate a new one.",
    });

    const unchangedUserAccessToken = await UserAccessToken.query().findById(
      userAccessToken.id,
    );
    expect(unchangedUserAccessToken?.lastUsedAt).toBeNull();
  });
});
