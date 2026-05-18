import { test as base, describe, expect } from "vitest";

import type { Account } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import { getRedisClient } from "@/util/redis/client";
import { setupRedis } from "@/util/redis/testing";

import { consumeAccountDeletionToken } from "./account-deletion";

const test = base.extend<{
  account: Account;
}>({
  account: async ({}, use) => {
    await setupDatabase();
    const account = await factory.UserAccount.create();
    await use(account);
  },
});

setupRedis();

async function seedToken(token: string, accountId: string) {
  const redis = await getRedisClient();
  await redis.set(`account_deletion:${hashToken(token)}`, accountId, {
    expiration: { type: "PX", value: 60 * 1000 },
  });
}

describe("account-deletion service", () => {
  test("consumes a valid token bound to the account", async ({ account }) => {
    await seedToken("good-token", account.id);
    const ok = await consumeAccountDeletionToken({
      token: "good-token",
      accountId: account.id,
    });
    expect(ok).toBe(true);
  });

  test("token is single-use", async ({ account }) => {
    await seedToken("once", account.id);
    await expect(
      consumeAccountDeletionToken({ token: "once", accountId: account.id }),
    ).resolves.toBe(true);
    await expect(
      consumeAccountDeletionToken({ token: "once", accountId: account.id }),
    ).resolves.toBe(false);
  });

  test("rejects when the bound account does not match", async ({ account }) => {
    await seedToken("mismatch", account.id);
    await expect(
      consumeAccountDeletionToken({
        token: "mismatch",
        accountId: "00000000-0000-0000-0000-000000000000",
      }),
    ).resolves.toBe(false);
    // The token should remain available for the legitimate account: a wrong
    // accountId attempt must not invalidate the legitimate owner's token.
    await expect(
      consumeAccountDeletionToken({ token: "mismatch", accountId: account.id }),
    ).resolves.toBe(true);
  });

  test("rejects an unknown token", async ({ account }) => {
    await expect(
      consumeAccountDeletionToken({
        token: "never-issued",
        accountId: account.id,
      }),
    ).resolves.toBe(false);
  });

  test("stores only the hashed token in Redis", async ({ account }) => {
    await seedToken("hashed-token", account.id);
    const redis = await getRedisClient();
    const plain = await redis.get("account_deletion:hashed-token");
    expect(plain).toBeNull();
    const hashed = await redis.get(
      `account_deletion:${hashToken("hashed-token")}`,
    );
    expect(hashed).toBe(account.id);
  });
});
