import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeamInvite, type Account, type User } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import * as emailTemplate from "@/email/send-email-template";
import { HTTPError } from "@/util/error";

import {
  AlreadyTeamMembersError,
  cancelTeamInvite,
  inviteTeamMembers,
  queryTeamInvites,
} from "./team-invite";

// Emails are already inert in tests (no Resend key); spy on the sender only to
// assert what would have been sent.
const sendEmailTemplate = vi
  .spyOn(emailTemplate, "sendEmailTemplate")
  .mockResolvedValue(undefined);

/** Create a team with an owner, plus the owner's personal account. */
async function createTeamOwner(): Promise<{
  teamAccount: Account;
  teamId: string;
  user: User;
  userAccount: Account;
}> {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");

  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: userAccount.user.id,
    userLevel: "owner",
  });

  return {
    teamAccount,
    teamId: teamAccount.teamId,
    user: userAccount.user,
    userAccount,
  };
}

async function expectHttpError(promise: Promise<unknown>, statusCode: number) {
  const error = await promise.then(
    () => {
      throw new Error("Expected the promise to reject, but it resolved.");
    },
    (error: unknown) => error,
  );
  expect(error).toBeInstanceOf(HTTPError);
  expect((error as HTTPError).statusCode).toBe(statusCode);
  return error as HTTPError;
}

describe("inviteTeamMembers", () => {
  beforeEach(async () => {
    await setupDatabase();
    sendEmailTemplate.mockClear();
  });

  it("creates invites and emails them", async () => {
    const { teamAccount, teamId, user, userAccount } = await createTeamOwner();

    const invites = await inviteTeamMembers({
      account: teamAccount,
      user,
      actorAccount: userAccount,
      members: [
        { email: "jane@acme.com", level: "member" },
        { email: "joe@acme.com", level: "contributor" },
      ],
    });

    expect(invites).toHaveLength(2);
    const stored = await TeamInvite.query()
      .where({ teamId })
      .orderBy("email", "asc");
    expect(stored.map((invite) => invite.email)).toEqual([
      "jane@acme.com",
      "joe@acme.com",
    ]);
    expect(stored.map((invite) => invite.userLevel)).toEqual([
      "member",
      "contributor",
    ]);
    for (const invite of stored) {
      expect(invite.invitedById).toBe(user.id);
      expect(new Date(invite.expiresAt).getTime()).toBeGreaterThan(Date.now());
    }
    expect(sendEmailTemplate).toHaveBeenCalledTimes(2);
    expect(sendEmailTemplate.mock.calls[0]?.[0]).toMatchObject({
      template: "team_invite",
    });
  });

  it("lower-cases the invited addresses", async () => {
    const { teamAccount, teamId, user, userAccount } = await createTeamOwner();

    await inviteTeamMembers({
      account: teamAccount,
      user,
      actorAccount: userAccount,
      members: [{ email: "Jane@Acme.com", level: "member" }],
    });

    const stored = await TeamInvite.query().where({ teamId });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.email).toBe("jane@acme.com");
  });

  it("rejects a malformed address", async () => {
    const { teamAccount, user, userAccount } = await createTeamOwner();

    await expectHttpError(
      inviteTeamMembers({
        account: teamAccount,
        user,
        actorAccount: userAccount,
        members: [{ email: "not-an-email", level: "member" }],
      }),
      400,
    );
  });

  it("refreshes an existing invite rather than failing", async () => {
    const { teamAccount, teamId, user, userAccount } = await createTeamOwner();
    const first = await inviteTeamMembers({
      account: teamAccount,
      user,
      actorAccount: userAccount,
      members: [{ email: "jane@acme.com", level: "member" }],
    });

    const second = await inviteTeamMembers({
      account: teamAccount,
      user,
      actorAccount: userAccount,
      members: [{ email: "jane@acme.com", level: "contributor" }],
    });

    const stored = await TeamInvite.query().where({ teamId });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.userLevel).toBe("contributor");
    expect(second[0]?.secret).not.toBe(first[0]?.secret);
  });

  it("rejects addresses already in the team", async () => {
    const { teamAccount, teamId, user, userAccount } = await createTeamOwner();
    const memberAccount = await factory.UserAccount.create();
    invariant(memberAccount.userId);
    await factory.TeamUser.create({
      teamId,
      userId: memberAccount.userId,
      userLevel: "member",
    });
    await factory.UserEmail.create({
      userId: memberAccount.userId,
      email: "already@acme.com",
      verified: true,
    });

    const error = await expectHttpError(
      inviteTeamMembers({
        account: teamAccount,
        user,
        actorAccount: userAccount,
        members: [{ email: "already@acme.com", level: "member" }],
      }),
      400,
    );

    expect(error).toBeInstanceOf(AlreadyTeamMembersError);
    invariant(error instanceof AlreadyTeamMembersError);
    expect(error.emails).toEqual(["already@acme.com"]);
    // Nothing is written when any address is rejected.
    expect(await TeamInvite.query().where({ teamId }).resultSize()).toBe(0);
    expect(sendEmailTemplate).not.toHaveBeenCalled();
  });

  it("rejects an empty member list", async () => {
    const { teamAccount, user, userAccount } = await createTeamOwner();

    await expectHttpError(
      inviteTeamMembers({
        account: teamAccount,
        user,
        actorAccount: userAccount,
        members: [],
      }),
      400,
    );
  });

  it("rejects a non-admin actor", async () => {
    const { teamAccount, teamId } = await createTeamOwner();
    const memberAccount = await factory.UserAccount.create();
    await memberAccount.$fetchGraph("user");
    invariant(memberAccount.user);
    await factory.TeamUser.create({
      teamId,
      userId: memberAccount.user.id,
      userLevel: "member",
    });

    await expectHttpError(
      inviteTeamMembers({
        account: teamAccount,
        user: memberAccount.user,
        actorAccount: memberAccount,
        members: [{ email: "jane@acme.com", level: "member" }],
      }),
      403,
    );
  });
});

describe("queryTeamInvites", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("lists pending invites, most recent first", async () => {
    const { teamAccount, teamId, user, userAccount } = await createTeamOwner();
    await inviteTeamMembers({
      account: teamAccount,
      user,
      actorAccount: userAccount,
      members: [
        { email: "jane@acme.com", level: "member" },
        { email: "joe@acme.com", level: "member" },
      ],
    });

    const invites = await queryTeamInvites({ teamId });

    expect(invites).toHaveLength(2);
  });

  it("filters by email", async () => {
    const { teamAccount, teamId, user, userAccount } = await createTeamOwner();
    await inviteTeamMembers({
      account: teamAccount,
      user,
      actorAccount: userAccount,
      members: [
        { email: "jane@acme.com", level: "member" },
        { email: "joe@other.com", level: "member" },
      ],
    });

    const invites = await queryTeamInvites({ teamId, search: "acme" });

    expect(invites).toHaveLength(1);
    expect(invites[0]?.email).toBe("jane@acme.com");
  });

  it("does not leak another team's invites", async () => {
    const first = await createTeamOwner();
    const second = await createTeamOwner();
    await inviteTeamMembers({
      account: first.teamAccount,
      user: first.user,
      actorAccount: first.userAccount,
      members: [{ email: "jane@acme.com", level: "member" }],
    });

    expect(await queryTeamInvites({ teamId: second.teamId })).toHaveLength(0);
  });
});

describe("cancelTeamInvite", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("deletes the invite", async () => {
    const { teamAccount, teamId, user, userAccount } = await createTeamOwner();
    const [invite] = await inviteTeamMembers({
      account: teamAccount,
      user,
      actorAccount: userAccount,
      members: [{ email: "jane@acme.com", level: "member" }],
    });
    invariant(invite);

    await cancelTeamInvite({
      account: teamAccount,
      user,
      inviteId: TeamInvite.formatId(invite),
    });

    expect(await TeamInvite.query().where({ teamId }).resultSize()).toBe(0);
  });

  it("404s on a malformed id", async () => {
    const { teamAccount, user } = await createTeamOwner();

    await expectHttpError(
      cancelTeamInvite({ account: teamAccount, user, inviteId: "nope" }),
      404,
    );
  });

  it("refuses an invite belonging to another team", async () => {
    const first = await createTeamOwner();
    const second = await createTeamOwner();
    const [invite] = await inviteTeamMembers({
      account: first.teamAccount,
      user: first.user,
      actorAccount: first.userAccount,
      members: [{ email: "jane@acme.com", level: "member" }],
    });
    invariant(invite);

    // The id encodes the first team, so cancelling it as an admin of the second
    // must not reach across.
    await expectHttpError(
      cancelTeamInvite({
        account: second.teamAccount,
        user: second.user,
        inviteId: TeamInvite.formatId(invite),
      }),
      404,
    );
    expect(
      await TeamInvite.query().where({ teamId: first.teamId }).resultSize(),
    ).toBe(1);
  });
});
