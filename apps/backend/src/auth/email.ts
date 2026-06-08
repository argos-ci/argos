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

type VerifyAuthEmailCodeResult = {
  valid: boolean;
  locked: boolean;
  remainingTime?: number;
};

// Configuration for account lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Atomically verifies a code, tracks failed attempts, and applies lockout.
//
// KEYS[1] = verification code key
// KEYS[2] = failed attempt counter key
// KEYS[3] = lockout key
// ARGV[1] = provided code
// ARGV[2] = lockout duration in ms
// ARGV[3] = max failed attempts
const VERIFY_AUTH_EMAIL_CODE_SCRIPT = `
local lockTtl = redis.call("PTTL", KEYS[3])
if lockTtl == -1 then
  redis.call("PEXPIRE", KEYS[3], ARGV[2])
  lockTtl = tonumber(ARGV[2])
end
if lockTtl ~= -2 then
  return {0, 1, lockTtl}
end

local storedCode = redis.call("GET", KEYS[1])
if not storedCode then
  return {0, 0, 0}
end

if storedCode == ARGV[1] then
  redis.call("DEL", KEYS[1])
  redis.call("DEL", KEYS[2])
  return {1, 0, 0}
end

local attempts = redis.call("INCR", KEYS[2])
redis.call("PEXPIRE", KEYS[2], ARGV[2])

if attempts >= tonumber(ARGV[3]) then
  redis.call("SET", KEYS[3], "locked", "PX", ARGV[2])
  return {0, 1, tonumber(ARGV[2])}
end

return {0, 0, 0}
`;

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
 * Verify that the token is valid for the given email.
 */
export async function verifyAuthEmailCode(args: {
  code: string;
  email: string;
}): Promise<VerifyAuthEmailCodeResult> {
  const { code, email } = args;
  const redis = await getRedisClient();
  const result = (await redis.eval(VERIFY_AUTH_EMAIL_CODE_SCRIPT, {
    keys: [
      getRedisKey(email),
      getFailedAttemptsKey(email),
      getLockoutKey(email),
    ],
    arguments: [
      String(code),
      LOCKOUT_DURATION_MS.toString(),
      String(MAX_FAILED_ATTEMPTS),
    ],
  })) as [number, number, number];

  const [valid, locked, remainingTime] = result;
  return {
    valid: valid === 1,
    locked: locked === 1,
    ...(remainingTime > 0 ? { remainingTime } : {}),
  };
}
