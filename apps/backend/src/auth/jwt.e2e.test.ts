import type { Request } from "express";
import jwt from "jsonwebtoken";
import { test as base, describe, expect } from "vitest";

import config from "@/config";
import type { Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  createJWT,
  getAuthPayloadFromJWT,
  JWT_VERSION,
  jwtAuthFromExpressReq,
  verifyJWT,
} from "./jwt";

const test = base.extend<{
  userAccount: Account;
}>({
  userAccount: async ({}, use) => {
    await setupDatabase();
    const userAccount = await factory.UserAccount.create();
    await use(userAccount);
  },
});

describe("createJWT", () => {
  test("creates a token that verifyJWT can decode", ({ userAccount }) => {
    const token = createJWT({
      version: JWT_VERSION,
      account: {
        id: userAccount.id,
        slug: userAccount.slug,
        name: userAccount.name,
      },
    });

    expect(verifyJWT(token)).toMatchObject({
      version: JWT_VERSION,
      account: {
        id: userAccount.id,
        slug: userAccount.slug,
        name: userAccount.name,
      },
    });
  });
});

describe("verifyJWT", () => {
  test("returns null when the token is invalid", () => {
    expect(verifyJWT("invalid-token")).toBeNull();
  });

  test("returns null when the token version does not match", ({
    userAccount,
  }) => {
    const token = jwt.sign(
      {
        version: 1,
        account: {
          id: userAccount.id,
          slug: userAccount.slug,
          name: userAccount.name,
        },
      },
      config.get("session.secret"),
    );

    expect(verifyJWT(token)).toBeNull();
  });
});

describe("getAuthPayloadFromJWT", () => {
  test("returns the auth payload for an existing account", async ({
    userAccount,
  }) => {
    const token = createJWT({
      version: JWT_VERSION,
      account: {
        id: userAccount.id,
        slug: userAccount.slug,
        name: userAccount.name,
      },
    });

    const payload = await getAuthPayloadFromJWT(token);

    expect(payload.type).toBe("jwt");
    expect(payload.account.id).toBe(userAccount.id);
    expect(payload.user.id).toBe(userAccount.userId);
  });

  test("throws when the token is invalid", async () => {
    await expect(getAuthPayloadFromJWT("invalid-token")).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid JWT",
    });
  });

  test("throws when the account does not exist anymore", async ({
    userAccount,
  }) => {
    const token = createJWT({
      version: JWT_VERSION,
      account: {
        id: String(Number(userAccount.id) + 1_000_000),
        slug: userAccount.slug,
        name: userAccount.name,
      },
    });

    await expect(getAuthPayloadFromJWT(token)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid JWT",
    });
  });
});

describe("jwtAuthFromExpressReq", () => {
  test("reads the bearer token from the request and returns the auth payload", async ({
    userAccount,
  }) => {
    const token = createJWT({
      version: JWT_VERSION,
      account: {
        id: userAccount.id,
        slug: userAccount.slug,
        name: userAccount.name,
      },
    });
    const request = {
      get(name: string) {
        return name === "authorization" ? `Bearer ${token}` : undefined;
      },
    } as unknown as Request;

    const payload = await jwtAuthFromExpressReq(request);

    expect(payload.type).toBe("jwt");
    expect(payload.account.id).toBe(userAccount.id);
    expect(payload.user.id).toBe(userAccount.userId);
  });

  test("throws when the authorization header is missing", async () => {
    const request = {
      get() {
        return undefined;
      },
    } as unknown as Request;

    await expect(jwtAuthFromExpressReq(request)).rejects.toMatchObject({
      statusCode: 401,
      message: "Authorization header is missing",
    });
  });
});
