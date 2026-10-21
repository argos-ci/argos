import type { TransactionOrKnex } from "objection";
import { z } from "zod";

import config from "@/config";
import { UserEmail, type Account } from "@/database/models";
import { generateRandomString } from "@/database/services/crypto";
import { sendEmailTemplate } from "@/email/send-email-template";
import { getRedisClient } from "@/util/redis/client";

function getRedisKey(token: string) {
  return `email_verification_link:${token}`;
}

const EmailVerificationSchema = z.object({
  email: z.string(),
  userId: z.string(),
});

/**
 * Generate a URL for email verification.
 */
async function generateEmailVerificationURL(input: {
  email: string;
  userId: string;
}) {
  const redis = await getRedisClient();
  const token = generateRandomString(24);
  await redis.set(
    getRedisKey(token),
    JSON.stringify({ email: input.email, userId: input.userId }),
    {
      expiration: {
        type: "PX",
        value: 15 * 60 * 1000, // 15 minutes
      },
    },
  );
  const url = new URL("/verify", config.get("server.url"));
  url.searchParams.set("token", token);
  url.searchParams.set("email", input.email);
  return url;
}

/**
 * Consume a verification token issued for the given email.
 * Returns the id of the user who requested it, or `null` if it is not valid.
 */
async function consumeEmailVerificationToken(args: {
  token: string;
  email: string;
}) {
  const redis = await getRedisClient();
  const key = getRedisKey(args.token);
  const stored = await redis.get(key);
  if (!stored) {
    return null;
  }
  const verification = EmailVerificationSchema.parse(JSON.parse(stored));
  if (verification.email !== args.email) {
    return null;
  }
  await redis.del(key);
  return verification.userId;
}

/**
 * Give a user an email they have proven to own, as verified. Whoever holds it
 * unverified loses it: that proves nothing, and the email is the table's
 * primary key. A verified holder keeps it.
 *
 * Returns `false` when the email was already verified, by this user or another.
 */
export async function claimVerifiedEmail(input: {
  email: string;
  userId: string;
  trx?: TransactionOrKnex;
}): Promise<boolean> {
  const { email, userId, trx } = input;
  await UserEmail.query(trx).delete().where({ email, verified: false });
  const inserted = await UserEmail.query(trx)
    .insert([{ email, userId, verified: true }])
    .onConflict("email")
    .ignore()
    .returning("email");
  return inserted.length > 0;
}

/**
 * Mark the email as verified.
 * Returns `true` if the email was successfully verified, `false` otherwise.
 */
export async function markEmailAsVerified(input: {
  email: string;
  token: string;
}) {
  const userId = await consumeEmailVerificationToken(input);
  if (!userId) {
    return false;
  }
  // Only the row of the user who requested the link: anyone can take over an
  // unverified email after it was sent, and the click must not verify it for
  // them.
  const patched = await UserEmail.query()
    .where({ email: input.email, userId, verified: false })
    .patch({ verified: true });
  return patched > 0;
}

/**
 * Send a verification email to check if the email is valid and belongs to the account.
 */
export async function sendVerificationEmail(input: {
  email: string;
  userId: string;
  account: Account;
}) {
  const url = await generateEmailVerificationURL({
    email: input.email,
    userId: input.userId,
  });
  await sendEmailTemplate({
    template: "email_verification",
    data: {
      email: input.email,
      name: input.account.displayName,
      verifyUrl: url.toString(),
    },
    to: [input.email],
  });
}
