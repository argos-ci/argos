import { invariant } from "@argos/util/invariant";
import { describe, expect, test } from "vitest";

import { Account, Team, TeamUser, User } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { HTTPError } from "@/util/error";

import {
  assertTeamAdmin,
  loadAccountById,
  queryTeamMembers,
  removeTeamMember,
  resetTeamInviteLink,
  setTeamDefaultUserLevel,
  setTeamMemberLevel,
} from "./team-member";

type Ctx = {
  /** Owner of the team, the actor for every authorized case below. */
  owner: User;
  teamAccount: Account;
  teamId: string;
};

const withTeam = test.extend<Ctx>({
  owner: async ({}, use) => {
    await setupDatabase();
    const userAccount = await factory.UserAccount.create();
    invariant(userAccount.userId, "user account has no user");
    const user = await User.query().findById(userAccount.userId);
    invariant(user, "user not found");
    await use(user);
  },
  teamAccount: async ({ owner }, use) => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId, "team account has no team");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: owner.id,
      userLevel: "owner",
    });
    await use(teamAccount);
  },
  teamId: async ({ teamAccount }, use) => {
    invariant(teamAccount.teamId);
    await use(teamAccount.teamId);
  },
});

/** Add a member to the team and return their personal account. */
async function addMember(args: {
  teamId: string;
  userLevel: TeamUser["userLevel"];
}): Promise<Account> {
  const userAccount = await factory.UserAccount.create();
  invariant(userAccount.userId, "user account has no user");
  await factory.TeamUser.create({
    teamId: args.teamId,
    userId: userAccount.userId,
    userLevel: args.userLevel,
  });
  return userAccount;
}

async function expectHttpError(
  promise: Promise<unknown>,
  statusCode: number,
): Promise<HTTPError> {
  const error = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  expect(error, "expected the call to reject").toBeInstanceOf(HTTPError);
  invariant(error instanceof HTTPError);
  expect(error.statusCode).toBe(statusCode);
  return error;
}

describe("assertTeamAdmin", () => {
  withTeam(
    "returns the team id for an owner",
    async ({ owner, teamAccount }) => {
      expect(await assertTeamAdmin({ account: teamAccount, user: owner })).toBe(
        teamAccount.teamId,
      );
    },
  );

  withTeam("rejects a plain member", async ({ teamAccount, teamId }) => {
    const memberAccount = await addMember({ teamId, userLevel: "member" });
    invariant(memberAccount.userId);
    const member = await User.query().findById(memberAccount.userId);
    invariant(member);

    await expectHttpError(
      assertTeamAdmin({ account: teamAccount, user: member }),
      403,
    );
  });

  withTeam("rejects a personal account", async ({ owner }) => {
    const userAccount = await Account.query().findOne({ userId: owner.id });
    invariant(userAccount);

    await expectHttpError(
      assertTeamAdmin({ account: userAccount, user: owner }),
      400,
    );
  });
});

describe("loadAccountById", () => {
  withTeam("loads an account", async ({ teamAccount }) => {
    const loaded = await loadAccountById(teamAccount.id);
    expect(loaded.id).toBe(teamAccount.id);
  });

  withTeam("rejects a non-numeric id", async () => {
    await expectHttpError(loadAccountById("not-an-id"), 400);
  });

  withTeam("404s on a missing account", async () => {
    await expectHttpError(loadAccountById("99999999"), 404);
  });
});

describe("queryTeamMembers", () => {
  withTeam("lists every member", async ({ teamAccount, teamId }) => {
    await addMember({ teamId, userLevel: "member" });
    const team = await Team.query().findById(teamId);
    invariant(team);

    const members = await queryTeamMembers({ team });

    expect(members).toHaveLength(2);
    // The team account fixture is unrelated to the members' accounts.
    expect(teamAccount.teamId).toBe(teamId);
  });

  withTeam("filters by level", async ({ teamId }) => {
    await addMember({ teamId, userLevel: "contributor" });
    const team = await Team.query().findById(teamId);
    invariant(team);

    const members = await queryTeamMembers({
      team,
      filters: { levels: ["contributor"] },
    });

    expect(members).toHaveLength(1);
    expect(members[0]?.userLevel).toBe("contributor");
  });

  withTeam("filters by search on the account slug", async ({ teamId }) => {
    const memberAccount = await addMember({ teamId, userLevel: "member" });
    const team = await Team.query().findById(teamId);
    invariant(team);

    const members = await queryTeamMembers({
      team,
      filters: { search: memberAccount.slug },
    });

    expect(members).toHaveLength(1);
    expect(members[0]?.userId).toBe(memberAccount.userId);
  });

  withTeam("ignores the sso filter without SSO", async ({ teamId }) => {
    await addMember({ teamId, userLevel: "member" });
    const team = await Team.query().findById(teamId);
    invariant(team);

    const members = await queryTeamMembers({ team, filters: { sso: true } });

    expect(members).toHaveLength(2);
  });
});

describe("setTeamMemberLevel", () => {
  withTeam("changes the level", async ({ owner, teamAccount, teamId }) => {
    const memberAccount = await addMember({ teamId, userLevel: "member" });

    const teamUser = await setTeamMemberLevel({
      account: teamAccount,
      user: owner,
      userAccountId: memberAccount.id,
      level: "contributor",
    });

    expect(teamUser.userLevel).toBe("contributor");
    const reloaded = await TeamUser.query().findById(teamUser.id);
    expect(reloaded?.userLevel).toBe("contributor");
  });

  withTeam(
    "is a no-op when the level is unchanged",
    async ({ owner, teamAccount, teamId }) => {
      const memberAccount = await addMember({ teamId, userLevel: "member" });

      const teamUser = await setTeamMemberLevel({
        account: teamAccount,
        user: owner,
        userAccountId: memberAccount.id,
        level: "member",
      });

      expect(teamUser.userLevel).toBe("member");
    },
  );

  withTeam("404s on a non-member", async ({ owner, teamAccount }) => {
    const stranger = await factory.UserAccount.create();

    await expectHttpError(
      setTeamMemberLevel({
        account: teamAccount,
        user: owner,
        userAccountId: stranger.id,
        level: "member",
      }),
      404,
    );
  });

  withTeam("rejects a non-admin actor", async ({ teamAccount, teamId }) => {
    const memberAccount = await addMember({ teamId, userLevel: "member" });
    invariant(memberAccount.userId);
    const member = await User.query().findById(memberAccount.userId);
    invariant(member);

    await expectHttpError(
      setTeamMemberLevel({
        account: teamAccount,
        user: member,
        userAccountId: memberAccount.id,
        level: "owner",
      }),
      403,
    );
  });
});

describe("removeTeamMember", () => {
  withTeam("removes a member", async ({ owner, teamAccount, teamId }) => {
    const memberAccount = await addMember({ teamId, userLevel: "member" });

    const { teamMemberId } = await removeTeamMember({
      account: teamAccount,
      user: owner,
      userAccountId: memberAccount.id,
    });

    expect(await TeamUser.query().findById(teamMemberId)).toBeUndefined();
    expect(await TeamUser.query().where({ teamId }).resultSize()).toBe(1);
  });

  withTeam(
    "promotes the last remaining member to owner",
    async ({ owner, teamAccount, teamId }) => {
      // The owner leaves a two-person team: without the promotion the survivor
      // would be a plain member, and nobody could administer the team again.
      const memberAccount = await addMember({ teamId, userLevel: "member" });
      const ownerAccount = await Account.query().findOne({ userId: owner.id });
      invariant(ownerAccount);

      await removeTeamMember({
        account: teamAccount,
        user: owner,
        userAccountId: ownerAccount.id,
      });

      const survivors = await TeamUser.query().where({ teamId });
      expect(survivors).toHaveLength(1);
      expect(survivors[0]?.userId).toBe(memberAccount.userId);
      expect(survivors[0]?.userLevel).toBe("owner");
    },
  );

  withTeam(
    "refuses to remove the last member",
    async ({ owner, teamAccount }) => {
      const ownerAccount = await Account.query().findOne({ userId: owner.id });
      invariant(ownerAccount);

      await expectHttpError(
        removeTeamMember({
          account: teamAccount,
          user: owner,
          userAccountId: ownerAccount.id,
        }),
        403,
      );
    },
  );
});

describe("setTeamDefaultUserLevel", () => {
  withTeam(
    "updates the team default",
    async ({ owner, teamAccount, teamId }) => {
      await setTeamDefaultUserLevel({
        account: teamAccount,
        user: owner,
        level: "contributor",
      });

      const team = await Team.query().findById(teamId);
      expect(team?.defaultUserLevel).toBe("contributor");
    },
  );
});

describe("resetTeamInviteLink", () => {
  withTeam("rotates the secret", async ({ owner, teamAccount, teamId }) => {
    const before = await Team.query().findById(teamId);
    invariant(before);
    const previousLink = await before.$getInviteLink();

    const link = await resetTeamInviteLink({
      account: teamAccount,
      user: owner,
    });

    expect(link).not.toBe(previousLink);
    const after = await Team.query().findById(teamId);
    expect(after?.inviteSecret).not.toBe(before.inviteSecret);
    expect(link).toContain(after?.inviteSecret);
  });
});
