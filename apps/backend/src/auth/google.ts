import { invariant } from "@argos/util/invariant";

import { Account } from "@/database/models";

/**
 * Disconnect the Google account from the user.
 */
export async function disconnectGoogleAuth(account: Account): Promise<Account> {
  if (account.type === "team") {
    throw new Error("Cannot disconnect Google account from a team account");
  }
  const user = await account.$relatedQuery("user");
  invariant(user, "User not found");
  if (user.googleUserId !== null) {
    await user.$query().patch({
      googleUserId: null,
    });
  }
  return account;
}
