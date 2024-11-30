import { invariant } from "@argos/util/invariant";

import { transaction } from "@/database";
import { Account } from "@/database/models";

/**
 * Disconnect the GitHub account from the user.
 */
export async function disconnectGitHubAuth(account: Account): Promise<Account> {
  if (account.type === "team") {
    throw new Error("Cannot disconnect GitHub account from a team account");
  }
  const user = await account.$relatedQuery("user");
  invariant(user, "User not found");
  const hasGitHubAccount = account.githubAccountId !== null;
  await transaction(async (trx) => {
    await Promise.all([
      hasGitHubAccount &&
        account.$query(trx).patch({
          githubAccountId: null,
        }),
      user.accessToken !== null &&
        user.$query(trx).patch({
          accessToken: null,
        }),
    ]);
  });
  return hasGitHubAccount ? account.$query() : account;
}
