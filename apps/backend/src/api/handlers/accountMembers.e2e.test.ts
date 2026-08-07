import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect, vi } from "vitest";
import z from "zod";

import {
  Account,
  TeamInvite,
  TeamUser,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import * as emailTemplate from "@/email/send-email-template";

import { createTestHandlerApp } from "../test-util";
import {
  cancelAccountInvite,
  createAccountInvites,
  listAccountInvites,
  resetAccountInviteLink,
} from "./accountInvites";
import { listAccountMembers } from "./listAccountMembers";
import {
  removeAccountMember,
  setAccountMemberLevel,
} from "./updateAccountMember";

const app = createTestHandlerApp(
  listAccountMembers,
  setAccountMemberLevel,
  removeAccountMember,
  listAccountInvites,
  createAccountInvites,
  cancelAccountInvite,
  resetAccountInviteLink,
);

const sendEmailTemplate = vi
  .spyOn(emailTemplate, "sendEmailTemplate")
  .mockResolvedValue(undefined);

async function createScopedPatToken(input: {
  user: User;
  account: Account;
  token: string;
}): Promise<string> {
  const userAccessToken = await factory.UserAccessToken.create({
    userId: input.user.id,
    token: hashToken(input.token),
  });
  await UserAccessTokenScope.query().insert({
    userAccessTokenId: userAccessToken.id,
    accountId: input.account.id,
  });
  return input.token;
}

const test = base.extend<{
  user: User;
  account: Account;
  scopedPatToken: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    sendEmailTemplate.mockClear();
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await use(user);
  },
  account: async ({ user }, use) => {
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    await use(account);
  },
  scopedPatToken: async ({ user, account }, use) => {
    const token = await createScopedPatToken({
      user,
      account,
      token: `arp_${"e".repeat(36)}`,
    });
    await use(token);
  },
});

/** Add a member to the team and return their personal account. */
async function addMember(args: {
  account: Account;
  userLevel: TeamUser["userLevel"];
}): Promise<Account> {
  const userAccount = await factory.UserAccount.create();
  invariant(userAccount.userId);
  await factory.TeamUser.create({
    teamId: args.account.teamId,
    userId: userAccount.userId,
    userLevel: args.userLevel,
  });
  return userAccount;
}

/** Create pending invites through the API and return their ids. */
async function createInvites(args: {
  token: string;
  members: { email: string; level: string }[];
}): Promise<string[]> {
  const res = await request(app)
    .post("/accounts/acme/invites")
    .set("Authorization", `Bearer ${args.token}`)
    .send({ members: args.members })
    .expect(201);
  return res.body.map((invite: { id: string }) => invite.id);
}

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("listAccountMembers", () => {
  test("lists the members", async ({ account, scopedPatToken, user }) => {
    const member = await addMember({ account, userLevel: "member" });

    const res = await request(app)
      .get("/accounts/acme/members")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body.pageInfo).toEqual({ total: 2, page: 1, perPage: 30 });
    const byUserId = new Map(
      res.body.results.map((result: { user: { id: string } }) => [
        result.user.id,
        result,
      ]),
    );
    const ownerAccount = await Account.query().findOne({ userId: user.id });
    invariant(ownerAccount);
    expect(byUserId.get(ownerAccount.id)).toMatchObject({ level: "owner" });
    expect(byUserId.get(member.id)).toMatchObject({
      level: "member",
      user: { id: member.id, slug: member.slug },
    });
  });

  test("filters by level", async ({ account, scopedPatToken }) => {
    await addMember({ account, userLevel: "contributor" });

    const res = await request(app)
      .get("/accounts/acme/members?levels=contributor")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].level).toBe("contributor");
  });

  test("rejects an unknown level", async ({ scopedPatToken }) => {
    await request(app)
      .get("/accounts/acme/members?levels=wizard")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(400);
  });

  test("filters by search", async ({ account, scopedPatToken }) => {
    const member = await addMember({ account, userLevel: "member" });

    const res = await request(app)
      .get(`/accounts/acme/members?search=${member.slug}`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].user.id).toBe(member.id);
  });

  test("paginates", async ({ account, scopedPatToken }) => {
    await addMember({ account, userLevel: "member" });

    const res = await request(app)
      .get("/accounts/acme/members?perPage=1&page=2")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.pageInfo).toEqual({ total: 2, page: 2, perPage: 1 });
  });

  test("401s without a valid token", async () => {
    await request(app)
      .get("/accounts/acme/members")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);
  });

  test("401s when the token is not scoped to the account", async ({
    user,
    scopedPatToken,
  }) => {
    const other = await factory.TeamAccount.create({ slug: "other" });
    await factory.TeamUser.create({
      teamId: other.teamId,
      userId: user.id,
      userLevel: "owner",
    });

    await request(app)
      .get("/accounts/other/members")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(401);
  });

  test("403s when the user is not an admin", async ({ user, account }) => {
    await TeamUser.query()
      .where({ teamId: account.teamId, userId: user.id })
      .patch({ userLevel: "member" });
    const token = await createScopedPatToken({
      user,
      account,
      token: `arp_${"f".repeat(36)}`,
    });

    await request(app)
      .get("/accounts/acme/members")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  test("400s on a personal account", async ({ user }) => {
    const personal = await Account.query().findOne({ userId: user.id });
    invariant(personal);
    const token = await createScopedPatToken({
      user,
      account: personal,
      token: `arp_${"a".repeat(36)}`,
    });

    await request(app)
      .get(`/accounts/${personal.slug}/members`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});

describe("setAccountMemberLevel", () => {
  test("changes the role", async ({ account, scopedPatToken }) => {
    const member = await addMember({ account, userLevel: "member" });

    const res = await request(app)
      .patch(`/accounts/acme/members/${member.id}`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ level: "contributor" })
      .expect(200);

    expect(res.body).toMatchObject({
      level: "contributor",
      user: { id: member.id },
    });
    const teamUser = await TeamUser.query().findOne({
      teamId: account.teamId,
      userId: member.userId,
    });
    expect(teamUser?.userLevel).toBe("contributor");
  });

  test("is idempotent", async ({ account, scopedPatToken }) => {
    const member = await addMember({ account, userLevel: "member" });

    const res = await request(app)
      .patch(`/accounts/acme/members/${member.id}`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ level: "member" })
      .expect(200);

    expect(res.body).toMatchObject({
      level: "member",
      user: { id: member.id },
    });
  });

  test("404s on a non-member", async ({ scopedPatToken }) => {
    const stranger = await factory.UserAccount.create();

    await request(app)
      .patch(`/accounts/acme/members/${stranger.id}`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ level: "member" })
      .expect(404);
  });

  test("400s on an invalid level", async ({ account, scopedPatToken }) => {
    const member = await addMember({ account, userLevel: "member" });

    await request(app)
      .patch(`/accounts/acme/members/${member.id}`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ level: "wizard" })
      .expect(400);
  });
});

describe("removeAccountMember", () => {
  test("removes the member", async ({ account, scopedPatToken }) => {
    const member = await addMember({ account, userLevel: "member" });

    await request(app)
      .delete(`/accounts/acme/members/${member.id}`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(204);

    const teamUser = await TeamUser.query().findOne({
      teamId: account.teamId,
      userId: member.userId,
    });
    expect(teamUser).toBeUndefined();
  });

  test("403s on the last member", async ({ user, account, scopedPatToken }) => {
    const ownerAccount = await Account.query().findOne({ userId: user.id });
    invariant(ownerAccount);

    await request(app)
      .delete(`/accounts/acme/members/${ownerAccount.id}`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(403);

    expect(
      await TeamUser.query().where({ teamId: account.teamId }).resultSize(),
    ).toBe(1);
  });
});

describe("createAccountInvites", () => {
  test("creates invites and sends the emails", async ({
    account,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post("/accounts/acme/invites")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({
        members: [
          { email: "jane@acme.com", level: "member" },
          { email: "joe@acme.com", level: "contributor" },
        ],
      })
      .expect(201);

    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: expect.any(String),
      email: expect.any(String),
      level: expect.any(String),
      expired: false,
    });
    expect(
      await TeamInvite.query().where({ teamId: account.teamId }).resultSize(),
    ).toBe(2);
    expect(sendEmailTemplate).toHaveBeenCalledTimes(2);
  });

  test("400s on a malformed email", async ({ scopedPatToken }) => {
    await request(app)
      .post("/accounts/acme/invites")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ members: [{ email: "not-an-email", level: "member" }] })
      .expect(400);
  });

  test("400s on an empty list", async ({ scopedPatToken }) => {
    await request(app)
      .post("/accounts/acme/invites")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ members: [] })
      .expect(400);
  });

  test("400s when the address is already a member", async ({
    account,
    scopedPatToken,
  }) => {
    const member = await addMember({ account, userLevel: "member" });
    invariant(member.userId);
    await factory.UserEmail.create({
      userId: member.userId,
      email: "already@acme.com",
      verified: true,
    });

    const res = await request(app)
      .post("/accounts/acme/invites")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({ members: [{ email: "already@acme.com", level: "member" }] })
      .expect(400);

    expect(res.body.error).toContain("already@acme.com");
  });
});

describe("listAccountInvites", () => {
  test("lists pending invites", async ({ scopedPatToken }) => {
    await createInvites({
      token: scopedPatToken,
      members: [{ email: "jane@acme.com", level: "member" }],
    });

    const res = await request(app)
      .get("/accounts/acme/invites")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body.pageInfo.total).toBe(1);
    expect(res.body.results[0]).toMatchObject({
      email: "jane@acme.com",
      level: "member",
      expired: false,
    });
  });

  test("filters by email", async ({ scopedPatToken }) => {
    await createInvites({
      token: scopedPatToken,
      members: [
        { email: "jane@acme.com", level: "member" },
        { email: "joe@other.com", level: "member" },
      ],
    });

    const res = await request(app)
      .get("/accounts/acme/invites?search=other.com")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].email).toBe("joe@other.com");
  });
});

describe("cancelAccountInvite", () => {
  test("cancels the invite", async ({ account, scopedPatToken }) => {
    const [inviteId] = await createInvites({
      token: scopedPatToken,
      members: [{ email: "jane@acme.com", level: "member" }],
    });

    await request(app)
      .delete(`/accounts/acme/invites/${inviteId}`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(204);

    expect(
      await TeamInvite.query().where({ teamId: account.teamId }).resultSize(),
    ).toBe(0);
  });

  test("404s on an unknown invite", async ({ scopedPatToken }) => {
    await request(app)
      .delete("/accounts/acme/invites/nope")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(404);
  });
});

describe("resetAccountInviteLink", () => {
  test("rotates the link", async ({ scopedPatToken }) => {
    const first = await request(app)
      .post("/accounts/acme/invite-link/reset")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    const second = await request(app)
      .post("/accounts/acme/invite-link/reset")
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(first.body.inviteLink).toMatch(/\/teams\/invite\//);
    expect(second.body.inviteLink).not.toBe(first.body.inviteLink);
  });
});
