import { generateRandomDigits } from "@/database/services/crypto";
import { getRedisClient } from "@/util/redis/client";

function getRedisKey(email: string) {
  return `email_verification:${email}`;
}

/**
 * Generate a code for email authentication.
 */
export async function generateAuthEmailCode(email: string) {
  const [redis, code] = await Promise.all([
    getRedisClient(),
    generateRandomDigits(6),
  ]);
  await redis.set(getRedisKey(email), code, {
    expiration: {
      type: "PX",
      value: 15 * 60 * 1000, // 15 minutes
    },
  });
  return code;
}

/**
 * Verify that the token is valid for the given email.
 */
export async function verifyAuthEmailCode(args: {
  code: string;
  email: string;
}) {
  const { code, email } = args;
  const redis = await getRedisClient();
  const key = getRedisKey(email);
  const storedCode = await redis.get(key);
  if (storedCode !== String(code)) {
    return false;
  }
  await redis.del(key);
  return true;
}
