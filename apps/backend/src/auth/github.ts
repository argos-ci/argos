import { invariant } from "@argos/util/invariant";

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
  if (account.githubAccountId !== null) {
    return account.$query().patchAndFetch({
      githubAccountId: null,
    });
  }
  return account;
}
