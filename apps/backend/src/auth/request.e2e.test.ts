import type { Request } from "express";
import { beforeEach, describe, expect, it } from "vitest";

import { UserAccessToken, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createJWT } from "./jwt";
import { getAuthPayloadFromRequest } from "./request";

const makeRequest = (authorization?: string): Request => {
  return {
    get: (header: string) =>
      header.toLowerCase() === "authorization" ? authorization : undefined,
  } as unknown as Request;
};

describe("getAuthPayloadFromRequest", () => {
  let user: Awaited<ReturnType<typeof factory.User.create>>;
  let account: Awaited<ReturnType<typeof factory.UserAccount.create>>;
  let validJwt: string;
  let validPatRawToken: string;

  beforeEach(async () => {
    await setupDatabase();
    const [localUser, localAccount] = await Promise.all([
      factory.User.create(),
      factory.UserAccount.create(),
    ]);
    user = localUser;
    account = localAccount;
    await account.$query().patch({ userId: user.id });
    validJwt = createJWT({
      version: 2,
      account: { id: account.id, slug: account.slug, name: account.name },
    });
    validPatRawToken = UserAccessToken.generateToken();
    await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(validPatRawToken),
    });
  });

  it("returns null when no authorization header", async () => {
    const result = await getAuthPayloadFromRequest(makeRequest());
    expect(result).toBeNull();
  });

  it("returns null when authorization header is not Bearer", async () => {
    const result = await getAuthPayloadFromRequest(
      makeRequest("Basic sometoken"),
    );
    expect(result).toBeNull();
  });

  it("throws when token is neither a valid JWT nor a known user access token", async () => {
    await expect(
      getAuthPayloadFromRequest(makeRequest("Bearer invalidtoken")),
    ).rejects.toMatchObject({
      message: "Invalid JWT",
      statusCode: 401,
    });
  });

  describe("JWT authentication", () => {
    it("authenticates with a valid JWT", async () => {
      const result = await getAuthPayloadFromRequest(
        makeRequest(`Bearer ${validJwt}`),
      );

      expect(result).not.toBeNull();
      expect(result!.account.id).toBe(account.id);
      expect(result!.user.id).toBe(user.id);
    });

    it("throws for an expired or tampered JWT", async () => {
      await expect(
        getAuthPayloadFromRequest(
          makeRequest("Bearer eyJhbGciOiJIUzI1NiJ9.invalid.signature"),
        ),
      ).rejects.toMatchObject({
        message: "Invalid JWT",
        statusCode: 401,
      });
    });
  });

  describe("User access token authentication", () => {
    it("authenticates with a valid user access token", async () => {
      const result = await getAuthPayloadFromRequest(
        makeRequest(`Bearer ${validPatRawToken}`),
      );

      expect(result).not.toBeNull();
      expect(result!.account.id).toBe(account.id);
      expect(result!.user.id).toBe(user.id);
    });

    it("updates lastUsedAt when authenticating with a user access token", async () => {
      const rawToken = UserAccessToken.generateToken();
      const userAccessToken = await factory.UserAccessToken.create({
        userId: user.id,
        token: hashToken(rawToken),
        lastUsedAt: null,
      });

      expect(userAccessToken.lastUsedAt).toBeNull();

      await getAuthPayloadFromRequest(makeRequest(`Bearer ${rawToken}`));

      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await userAccessToken.$query();
      expect(updated.lastUsedAt).not.toBeNull();
    });

    it("returns null for an unknown user access token", async () => {
      const result = await getAuthPayloadFromRequest(
        makeRequest(`Bearer ${UserAccessToken.generateToken()}`),
      );
      expect(result).toBeNull();
    });

    it("throws for an expired user access token", async () => {
      const rawToken = UserAccessToken.generateToken();
      await factory.UserAccessToken.create({
        userId: user.id,
        token: hashToken(rawToken),
        expireAt: new Date(Date.now() - 60_000).toISOString(),
      });

      await expect(
        getAuthPayloadFromRequest(makeRequest(`Bearer ${rawToken}`)),
      ).rejects.toMatchObject({
        message: "Personal access token has expired",
        statusCode: 401,
      });
    });

    it("returns null when scoped accounts are no longer accessible", async () => {
      const token = UserAccessToken.generateToken();
      const userAccessToken = await factory.UserAccessToken.create({
        userId: user.id,
        token: hashToken(token),
      });

      const otherUser = await factory.User.create();
      const otherAccount = await factory.UserAccount.create({
        userId: otherUser.id,
      });

      await UserAccessTokenScope.query().insert({
        userAccessTokenId: userAccessToken.id,
        accountId: otherAccount.id,
      });

      const result = await getAuthPayloadFromRequest(
        makeRequest(`Bearer ${token}`),
      );
      expect(result).toBeNull();
    });
  });
});
