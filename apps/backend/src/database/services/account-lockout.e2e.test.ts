import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test } from "vitest";

import { generateAuthEmailCode } from "@/auth/email";
import { setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";

import { authenticateWithEmail } from "./account";

setupRedis();

async function authenticateWithBadCode({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  await expect(authenticateWithEmail({ email, code })).rejects.toMatchObject({
    statusCode: 400,
    code: "INVALID_EMAIL_VERIFICATION_CODE",
  });
}

async function lockTheAccount(email: string) {
  // Lock the account
  for (let i = 0; i < 4; i++) {
    await authenticateWithBadCode({ email, code: "000000" });
  }

  // Check lockout error includes time message
  await expect(
    authenticateWithEmail({ email, code: "000000" }),
  ).rejects.toMatchObject({ statusCode: 429, code: "ACCOUNT_LOCKED" });
}

describe("authenticateWithEmail - account lockout", () => {
  let testEmail: string;

  beforeEach(async () => {
    await setupDatabase();
    testEmail = `lockout-test-${randomUUID()}@example.com`;
  });

  test("should lock account after 5 failed attempts", async () => {
    // Generate a valid code for later use
    await generateAuthEmailCode(testEmail);

    // Make 4 failed attempts
    for (let i = 0; i < 4; i++) {
      await authenticateWithBadCode({ email: testEmail, code: "000000" });
    }

    // 5th attempt should lock the account
    await expect(
      authenticateWithEmail({ email: testEmail, code: "111111" }),
    ).rejects.toMatchObject({ statusCode: 429, code: "ACCOUNT_LOCKED" });
  });

  test("should prevent authentication when account is locked", async () => {
    const code = await generateAuthEmailCode(testEmail);
    await lockTheAccount(testEmail);

    // Even with correct code, should be locked
    await expect(
      authenticateWithEmail({ email: testEmail, code }),
    ).rejects.toMatchObject({ statusCode: 429, code: "ACCOUNT_LOCKED" });
  });

  test("should reset failed attempts on successful authentication", async () => {
    const code = await generateAuthEmailCode(testEmail);

    // Make 2 failed attempts
    for (let i = 0; i < 2; i++) {
      await authenticateWithBadCode({ email: testEmail, code: "000000" });
    }

    // Successful authentication should clear failed attempts
    const result = await authenticateWithEmail({ email: testEmail, code });
    expect(result.account).toBeDefined();
    expect(result.creation).toBe(true);

    // Now a new code should work without triggering previous failed attempts
    const newCode = await generateAuthEmailCode(testEmail);
    const result2 = await authenticateWithEmail({
      email: testEmail,
      code: newCode,
    });
    expect(result2.account).toBeDefined();
  });

  test("should include remaining lockout time in error", async () => {
    for (let i = 0; i < 4; i++) {
      await authenticateWithBadCode({ email: testEmail, code: "000000" });
    }

    try {
      await authenticateWithEmail({ email: testEmail, code: "111111" });
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toMatch(/Account temporarily locked/);
        expect(error.message).toMatch(/Try again/);
      } else {
        throw error;
      }
    }
  });
});
