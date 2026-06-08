import { generateRandomDigits } from "@/database/services/crypto";
import { getRedisClient } from "@/util/redis/client";

function getRedisKey(email: string) {
  return `email_verification:${email}`;
}

function getFailedAttemptsKey(email: string) {
  return `email_failed_attempts:${email}`;
}

function getLockoutKey(email: string) {
  return `email_lockout:${email}`;
}

// Configuration for account lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const FAILED_ATTEMPTS_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a code for email authentication.
 */
export async function generateAuthEmailCode(email: string) {
  const redis = await getRedisClient();
  const code = generateRandomDigits(6);
  await redis.set(getRedisKey(email), code, {
    expiration: {
      type: "PX",
      value: 15 * 60 * 1000, // 15 minutes
    },
  });
  return code;
}

/**
 * Check if an email account is currently locked due to too many failed attempts.
 */
async function isAccountLocked(email: string): Promise<boolean> {
  const redis = await getRedisClient();
  const lockoutValue = await redis.get(getLockoutKey(email));
  return lockoutValue !== null;
}

/**
 * Get the remaining lockout time in milliseconds (0 if not locked).
 */
async function getRemainingLockoutTime(email: string): Promise<number> {
  const redis = await getRedisClient();
  const pttl = await redis.pTTL(getLockoutKey(email));
  // pttl returns -1 if key doesn't exist, -2 if expired
  return pttl > 0 ? pttl : 0;
}

/**
 * Lock an account for a specified duration.
 */
async function lockAccount(email: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(getLockoutKey(email), "locked", {
    expiration: {
      type: "PX",
      value: LOCKOUT_DURATION_MS,
    },
  });
}

/**
 * Increment the failed attempt counter for an email.
 */
async function incrementFailedAttempts(email: string): Promise<number> {
  const redis = await getRedisClient();
  const key = getFailedAttemptsKey(email);
  const attempts = await redis.incr(key);

  // Set expiration on first attempt
  if (attempts === 1) {
    await redis.expire(key, Math.ceil(FAILED_ATTEMPTS_WINDOW_MS / 1000));
  }

  return attempts;
}

/**
 * Clear failed attempts for an email.
 */
async function clearFailedAttempts(email: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(getFailedAttemptsKey(email));
}

/**
 * Verify that the token is valid for the given email.
 * Returns { valid: boolean, locked: boolean, remainingTime?: number }.
 */
export async function verifyAuthEmailCode(args: {
  code: string;
  email: string;
}): Promise<{
  valid: boolean;
  locked: boolean;
  remainingTime?: number;
}> {
  const { code, email } = args;
  const redis = await getRedisClient();

  // Check if account is locked
  if (await isAccountLocked(email)) {
    const remainingTime = await getRemainingLockoutTime(email);
    return {
      valid: false,
      locked: true,
      remainingTime,
    };
  }

  const key = getRedisKey(email);
  const storedCode = await redis.get(key);

  if (storedCode !== String(code)) {
    // Track failed attempt
    const attempts = await incrementFailedAttempts(email);

    // Lock account if max attempts exceeded
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await lockAccount(email);
    }

    return {
      valid: false,
      locked: false,
    };
  }

  // Successful verification - clear both the code and failed attempts
  await redis.del(key);
  await clearFailedAttempts(email);

  return {
    valid: true,
    locked: false,
  };
}
