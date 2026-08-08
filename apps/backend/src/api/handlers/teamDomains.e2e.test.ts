import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  Account,
  TeamDomain,
  TeamUser,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import {
  addTeamDomainHandler,
  listTeamDomainsHandler,
  removeTeamDomainHandler,
} from "./teamDomains";

const app = createTestHandlerApp(
  listTeamDomainsHandler,
  addTeamDomainHandler,
  removeTeamDomainHandler,
);

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
    // The acting user must hold a verified address on any domain they open the
    // team to.
    await factory.UserEmail.create({
      userId: user.id,
      email: "owner@acme.com",
      verified: true,
    });
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

describe("addTeamDomain", () => {
  test("opens the team to a domain the caller belongs to", async ({
    account,
    token,
  }) => {
    const res = await request(app)
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme.com" })
      .expect(201);

    expect(res.body).toMatchObject({ domain: "acme.com" });
    invariant(account.teamId);
    const stored = await TeamDomain.query().where({ teamId: account.teamId });
    expect(stored.map((row) => row.domain)).toEqual(["acme.com"]);
  });

  test("refuses a domain the caller has no verified address on", async ({
    account,
    token,
  }) => {
    const res = await request(app)
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "other-company.com" })
      .expect(400);

    expect(res.body.error).toMatch(/verified email/i);
    invariant(account.teamId);
    expect(
      await TeamDomain.query().where({ teamId: account.teamId }).resultSize(),
    ).toBe(0);
  });

  test("refuses a public email provider", async ({ user, account, token }) => {
    // Even with a verified address on it — otherwise every Gmail user who signs
    // up would be offered this team.
    await factory.UserEmail.create({
      userId: user.id,
      email: "someone@gmail.com",
      verified: true,
    });

    const res = await request(app)
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "gmail.com" })
      .expect(400);

    expect(res.body.error).toMatch(/public email provider/i);
    invariant(account.teamId);
    expect(
      await TeamDomain.query().where({ teamId: account.teamId }).resultSize(),
    ).toBe(0);
  });

  test("refuses an unverified address on the domain", async ({
    user,
    token,
  }) => {
    await factory.UserEmail.create({
      userId: user.id,
      email: "someone@unverified.com",
      verified: false,
    });

    await request(app)
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "unverified.com" })
      .expect(400);
  });

  test("400s on a malformed domain", async ({ token }) => {
    await request(app)
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "not a domain" })
      .expect(400);
  });

  test("400s when the domain is already linked", async ({ token }) => {
    await request(app)
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme.com" })
      .expect(201);

    const res = await request(app)
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme.com" })
      .expect(400);

    expect(res.body.error).toMatch(/already linked/i);
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
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme.com" })
      .expect(403);
  });
});

describe("listTeamDomains", () => {
  test("lists the team's domains", async ({ token }) => {
    await request(app)
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme.com" })
      .expect(201);

    const res = await request(app)
      .get("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ domain: "acme.com" });
  });

  test("does not leak another team's domains", async ({ user, token }) => {
    const other = await factory.TeamAccount.create({ slug: "other" });
    invariant(other.teamId);
    await factory.TeamUser.create({
      teamId: other.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    await TeamDomain.query().insert({
      teamId: other.teamId,
      domain: "elsewhere.com",
    });

    const res = await request(app)
      .get("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual([]);
  });
});

describe("removeTeamDomain", () => {
  test("removes the domain", async ({ account, token }) => {
    await request(app)
      .post("/accounts/acme/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "acme.com" })
      .expect(201);

    await request(app)
      .delete("/accounts/acme/domains/acme.com")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    invariant(account.teamId);
    expect(
      await TeamDomain.query().where({ teamId: account.teamId }).resultSize(),
    ).toBe(0);
  });

  test("404s on a domain the team does not have", async ({ token }) => {
    await request(app)
      .delete("/accounts/acme/domains/nope.com")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});
