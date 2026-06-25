import { z } from "zod";

import { Account } from "@/database/models";

export const UserSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string().nullable(),
  })
  .meta({ description: "A user.", id: "User" });

/** Serialize a user's personal account into the public API user shape. */
export function serializeUser(account: Account): z.infer<typeof UserSchema> {
  return { id: account.id, slug: account.slug, name: account.displayName };
}

/**
 * Resolve the personal accounts backing a set of user ids, keyed by user id, so
 * serializers can expose `user`/`dismissedBy`/reaction users without N+1
 * queries. Null/undefined ids are ignored.
 */
export async function getUserAccountsByUserId(
  userIds: (string | null | undefined)[],
): Promise<Map<string, Account>> {
  const ids = [...new Set(userIds.filter((id): id is string => id != null))];
  if (ids.length === 0) {
    return new Map();
  }
  const accounts = await Account.query().whereIn("userId", ids);
  return new Map(
    accounts.flatMap((account) =>
      account.userId ? [[account.userId, account] as const] : [],
    ),
  );
}
