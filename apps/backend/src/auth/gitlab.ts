import { invariant } from "@argos/util/invariant";

import { Account } from "@/database/models";

/**
 * Disconnect the GitLab account from the user.
 */
export async function disconnectGitLabAuth(account: Account): Promise<Account> {
  if (account.type === "team") {
    throw new Error("Cannot disconnect GitLab account from a team account");
  }
  const user = await account.$relatedQuery("user");
  invariant(user, "User not found");
  if (user.gitlabUserId !== null) {
    await user.$query().patch({
      gitlabUserId: null,
    });
  }
  return account;
}
