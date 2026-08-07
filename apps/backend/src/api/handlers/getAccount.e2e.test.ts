import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  Account,
  Team,
  TeamUser,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getAccount, updateAccount } from "./getAccount";

const app = createTestHandlerApp(getAccount, updateAccount);

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
  token: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
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
  token: async ({ user, account }, use) => {
    await use(
      await createScopedPatToken({
        user,
        account,
        token: `arp_${"e".repeat(36)}`,
      }),
    );
  },
});

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("getAccount", () => {
  test("returns the account with its usage", async ({ account, token }) => {
    const res = await request(app)
      .get("/accounts/acme")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: account.id,
      slug: "acme",
      type: "team",
      currentPeriodScreenshots: expect.any(Number),
      includedScreenshots: expect.any(Number),
      consumptionRatio: expect.any(Number),
      additionalScreenshotsCost: expect.any(Number),
      defaultUserLevel: "member",
    });
  });

  test("works on a personal account", async ({ user }) => {
    const personal = await Account.query().findOne({ userId: user.id });
    invariant(personal);
    const token = await createScopedPatToken({
      user,
      account: personal,
      token: `arp_${"a".repeat(36)}`,
    });

    const res = await request(app)
      .get(`/accounts/${personal.slug}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      type: "user",
      // A personal account has no team, so no joining default.
      defaultUserLevel: null,
    });
  });

  test("401s when the token is not scoped to the account", async ({ user }) => {
    const other = await factory.TeamAccount.create({ slug: "other" });
    await factory.TeamUser.create({
      teamId: other.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    const personal = await Account.query().findOne({ userId: user.id });
    invariant(personal);
    const token = await createScopedPatToken({
      user,
      account: personal,
      token: `arp_${"b".repeat(36)}`,
    });

    await request(app)
      .get("/accounts/other")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });

  test("401s without a valid token", async () => {
    await request(app)
      .get("/accounts/acme")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);
  });
});

describe("updateAccount", () => {
  test("changes the default user level", async ({ account, token }) => {
    const res = await request(app)
      .patch("/accounts/acme")
      .set("Authorization", `Bearer ${token}`)
      .send({ defaultUserLevel: "contributor" })
      .expect(200);

    expect(res.body.defaultUserLevel).toBe("contributor");
    invariant(account.teamId);
    const team = await Team.query().findById(account.teamId);
    expect(team?.defaultUserLevel).toBe("contributor");
  });

  test("400s on an unknown level", async ({ token }) => {
    await request(app)
      .patch("/accounts/acme")
      .set("Authorization", `Bearer ${token}`)
      .send({ defaultUserLevel: "owner" })
      .expect(400);
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
      .patch("/accounts/acme")
      .set("Authorization", `Bearer ${token}`)
      .send({ defaultUserLevel: "contributor" })
      .expect(403);

    invariant(account.teamId);
    const team = await Team.query().findById(account.teamId);
    expect(team?.defaultUserLevel).toBe("member");
  });

  test("400s on a personal account", async ({ user }) => {
    const personal = await Account.query().findOne({ userId: user.id });
    invariant(personal);
    const token = await createScopedPatToken({
      user,
      account: personal,
      token: `arp_${"c".repeat(36)}`,
    });

    await request(app)
      .patch(`/accounts/${personal.slug}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ defaultUserLevel: "contributor" })
      .expect(400);
  });
});
