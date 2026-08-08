import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Account,
  User,
  UserAccessToken,
  UserAccessTokenScope,
} from "@/database/models";
import * as accountService from "@/database/services/account";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import * as emailTemplate from "@/email/send-email-template";

import { createTestHandlerApp } from "../test-util";
import { exchangeEmailCode, requestEmailCode } from "./emailAuth";

const app = createTestHandlerApp(requestEmailCode, exchangeEmailCode);

const sendEmailTemplate = vi
  .spyOn(emailTemplate, "sendEmailTemplate")
  .mockResolvedValue(undefined);

/**
 * Read back the code Argos generated, the way the recipient would read it from
 * their inbox.
 */
function getSentCode(): string {
  const call = sendEmailTemplate.mock.calls.at(-1)?.[0];
  invariant(call, "no verification email was sent");
  const data = call.data as { code?: string };
  invariant(data.code, "the email carried no code");
  return data.code;
}

beforeEach(async () => {
  await setupDatabase();
  sendEmailTemplate.mockClear();
});

describe("requestEmailCode", () => {
  it("sends a code to a new address", async () => {
    await request(app)
      .post("/auth/email/code")
      .send({ email: "new@acme.com" })
      .expect(204);

    expect(sendEmailTemplate).toHaveBeenCalledOnce();
    expect(sendEmailTemplate.mock.calls[0]?.[0]).toMatchObject({
      template: "signup_verification",
      to: ["new@acme.com"],
    });
  });

  it("does not disclose that an address already has an account", async () => {
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await factory.UserEmail.create({
      userId: user.id,
      email: "existing@acme.com",
      verified: true,
    });

    const res = await request(app)
      .post("/auth/email/code")
      .send({ email: "existing@acme.com" })
      .expect(204);

    // Same status and empty body as for an unknown address; only the template
    // sent to the inbox differs.
    expect(res.body).toEqual({});
    expect(sendEmailTemplate.mock.calls[0]?.[0]).toMatchObject({
      template: "signup_signin_verification",
    });
  });

  it("400s on a malformed address", async () => {
    await request(app)
      .post("/auth/email/code")
      .send({ email: "not-an-email" })
      .expect(400);

    expect(sendEmailTemplate).not.toHaveBeenCalled();
  });
});

describe("exchangeEmailCode", () => {
  it("creates the account and returns a usable token", async () => {
    await request(app)
      .post("/auth/email/code")
      .send({ email: "new@acme.com" })
      .expect(204);

    const res = await request(app)
      .post("/auth/email/token")
      .send({ email: "new@acme.com", code: getSentCode() })
      .expect(200);

    expect(res.body).toMatchObject({
      token: expect.any(String),
      created: true,
      account: { id: expect.any(String), slug: expect.any(String) },
    });

    const account = await Account.query().findById(res.body.account.id);
    invariant(account?.userId, "the account was created with a user");

    // The token is real: it is stored hashed, sourced as a CLI token, and
    // scoped to the personal account only.
    const stored = await UserAccessToken.query().findOne({
      token: hashToken(res.body.token),
    });
    invariant(stored, "the returned token was not stored");
    expect(stored.userId).toBe(account.userId);
    expect(stored.source).toBe("cli");
    expect(stored.expireAt).toBeNull();

    const scopes = await UserAccessTokenScope.query().where({
      userAccessTokenId: stored.id,
    });
    expect(scopes.map((scope) => scope.accountId)).toEqual([account.id]);
  });

  it("signs in to an existing account without recreating it", async () => {
    const user = await factory.User.create();
    const userAccount = await factory.UserAccount.create({ userId: user.id });
    await factory.UserEmail.create({
      userId: user.id,
      email: "existing@acme.com",
      verified: true,
    });

    await request(app)
      .post("/auth/email/code")
      .send({ email: "existing@acme.com" })
      .expect(204);

    const res = await request(app)
      .post("/auth/email/token")
      .send({ email: "existing@acme.com", code: getSentCode() })
      .expect(200);

    expect(res.body.created).toBe(false);
    expect(res.body.account.id).toBe(userAccount.id);
    expect(await User.query().resultSize()).toBe(1);
  });

  it("does not scope the token to the user's teams", async () => {
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await factory.UserEmail.create({
      userId: user.id,
      email: "existing@acme.com",
      verified: true,
    });
    const team = await factory.TeamAccount.create({ slug: "acme" });
    await factory.TeamUser.create({
      teamId: team.teamId,
      userId: user.id,
      userLevel: "owner",
    });

    await request(app)
      .post("/auth/email/code")
      .send({ email: "existing@acme.com" })
      .expect(204);
    const res = await request(app)
      .post("/auth/email/token")
      .send({ email: "existing@acme.com", code: getSentCode() })
      .expect(200);

    const stored = await UserAccessToken.query().findOne({
      token: hashToken(res.body.token),
    });
    invariant(stored);
    const scopes = await UserAccessTokenScope.query().where({
      userAccessTokenId: stored.id,
    });
    // An email code is weaker proof than the browser login, so it never reaches
    // a team the user belongs to.
    expect(scopes.map((scope) => scope.accountId)).not.toContain(team.id);
  });

  it("400s on a wrong code and mints nothing", async () => {
    await request(app)
      .post("/auth/email/code")
      .send({ email: "new@acme.com" })
      .expect(204);

    await request(app)
      .post("/auth/email/token")
      .send({ email: "new@acme.com", code: "000000" })
      .expect(400);

    expect(await UserAccessToken.query().resultSize()).toBe(0);
    expect(await User.query().resultSize()).toBe(0);
  });

  it("400s when no code was ever requested", async () => {
    await request(app)
      .post("/auth/email/token")
      .send({ email: "nobody@acme.com", code: "123456" })
      .expect(400);

    expect(await User.query().resultSize()).toBe(0);
  });

  it("429s once the code has been locked out", async () => {
    // The lockout lives in the shared service; surface that it reaches the API
    // as a 429 rather than another 400.
    vi.spyOn(accountService, "authenticateWithEmail").mockRejectedValueOnce(
      Object.assign(new Error("Account temporarily locked."), {
        statusCode: 429,
      }),
    );

    await request(app)
      .post("/auth/email/token")
      .send({ email: "new@acme.com", code: "123456" })
      .expect(429);
  });
});
