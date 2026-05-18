import config from "@/config";
import type { Account } from "@/database/models";
import { generateRandomString, hashToken } from "@/database/services/crypto";
import { sendEmailTemplate } from "@/email/send-email-template";
import { getRedisClient } from "@/util/redis/client";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TOKEN_LENGTH = 32;

function getRedisKey(tokenHash: string) {
  return `account_deletion:${tokenHash}`;
}

/**
 * Generate a single-use, short-lived token bound to a user account, and
 * return the public token along with the confirmation URL.
 *
 * Only the SHA-256 hash of the token is stored in Redis, so a Redis snapshot
 * cannot be used to delete accounts.
 */
async function generateAccountDeletionURL(input: { accountId: string }) {
  const redis = await getRedisClient();
  const token = generateRandomString(TOKEN_LENGTH);
  await redis.set(getRedisKey(hashToken(token)), input.accountId, {
    expiration: {
      type: "PX",
      value: TOKEN_TTL_MS,
    },
  });
  const url = new URL("/account/delete", config.get("server.url"));
  url.searchParams.set("token", token);
  return { token, url };
}

/**
 * Consume a deletion token. Returns the bound account id if the token is
 * valid for the given account, otherwise null. The token is deleted on use,
 * making it single-use.
 */
export async function consumeAccountDeletionToken(input: {
  token: string;
  accountId: string;
}): Promise<boolean> {
  const redis = await getRedisClient();
  const key = getRedisKey(hashToken(input.token));
  const storedAccountId = await redis.get(key);
  if (storedAccountId !== input.accountId) {
    return false;
  }
  await redis.del(key);
  return true;
}

/**
 * Send a confirmation email containing a link that, when clicked, allows the
 * user to confirm the deletion of their account.
 */
export async function sendAccountDeletionRequestEmail(input: {
  account: Account;
  email: string;
}) {
  const { url } = await generateAccountDeletionURL({
    accountId: input.account.id,
  });
  await sendEmailTemplate({
    template: "account_deletion_request",
    data: {
      name: input.account.displayName,
      confirmUrl: url.toString(),
    },
    to: [input.email],
  });
}

/**
 * Send a final email confirming that the account has been deleted.
 * Sent directly (not via the notification system) because the user no longer
 * exists by the time we send it.
 */
export async function sendAccountDeletedEmail(input: {
  name: string;
  email: string;
}) {
  await sendEmailTemplate({
    template: "account_deleted",
    data: {
      name: input.name,
    },
    to: [input.email],
  });
}
