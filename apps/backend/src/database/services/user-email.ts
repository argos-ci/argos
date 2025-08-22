import config from "@/config";
import { UserEmail, type Account } from "@/database/models";
import { generateRandomHexString } from "@/database/services/crypto";
import { sendEmailTemplate } from "@/email/send-email-template";
import { getRedisClient } from "@/util/redis/client";

function getRedisKey(token: string) {
  return `email_verification:${token}`;
}

/**
 * Generate a URL for email verification.
 */
async function generateEmailVerificationURL(email: string) {
  const [redis, token] = await Promise.all([
    getRedisClient(),
    generateRandomHexString(24),
  ]);
  await redis.set(getRedisKey(token), email, {
    expiration: {
      type: "PX",
      value: 15 * 60 * 1000, // 15 minutes
    },
  });
  const url = new URL("/verify", config.get("server.url"));
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url;
}

/**
 * Verify that the token is valid for the given email.
 */
async function verifyEmailToken(token: string, email: string) {
  const redis = await getRedisClient();
  const storedEmail = await redis.get(getRedisKey(token));
  if (storedEmail !== email) {
    return false;
  }
  await redis.del(`email_verification:${token}`);
  return true;
}

/**
 * Mark the email as verified.
 * Returns `true` if the email was successfully verified, `false` otherwise.
 */
export async function markEmailAsVerified(input: {
  email: string;
  token: string;
}) {
  const verified = await verifyEmailToken(input.token, input.email);
  if (!verified) {
    return false;
  }
  await UserEmail.query().where({ email: input.email }).patch({
    verified: true,
  });
  return true;
}

/**
 * Send a verification email to check if the email is valid and belongs to the account.
 */
export async function sendVerificationEmail(input: {
  email: string;
  account: Account;
}) {
  const url = await generateEmailVerificationURL(input.email);
  await sendEmailTemplate({
    template: "email_verification",
    data: {
      email: input.email,
      name: input.account.name || input.account.slug,
      verifyUrl: url.toString(),
    },
    to: [input.email],
  });
}
