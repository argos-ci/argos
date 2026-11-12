import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import type { Account, User } from "@/database/models";

import { checkTeamSamlEnforced } from "./saml";

/**
 * What a user's token reaches, from the accounts it was issued for. Expects
 * each entry's `account.teamSamlConfig` and the user's `teams` to be fetched.
 */
export async function resolveTokenScope(
  user: User,
  entries: { account?: Account; samlAuthorized: boolean }[],
): Promise<{
  /** Accounts the token may act on. */
  scope: Account[];
  /** Teams of the scope whose SAML IdP the token was issued through. */
  samlTeamIds: string[];
  /**
   * Teams left out of the scope because they enforce SAML and the token was
   * not issued through their IdP, kept apart so the API can say why.
   */
  samlRequiredScope: Account[];
}> {
  invariant(user.teams, "user teams not fetched");
  const userTeamIds = new Set(user.teams.map((team) => team.id));
  const scope: Account[] = [];
  const samlTeamIds: string[] = [];
  const samlRequiredScope: Account[] = [];

  for (const { account, samlAuthorized } of entries) {
    invariant(account, "scope account not fetched");
    switch (account.type) {
      case "user": {
        if (account.userId === user.id) {
          scope.push(account);
        }
        break;
      }
      case "team": {
        invariant(account.teamId);
        // A team the user has left is out of the scope, silently.
        if (!userTeamIds.has(account.teamId)) {
          break;
        }
        if (samlAuthorized) {
          samlTeamIds.push(account.teamId);
          scope.push(account);
        } else if (await checkTeamSamlEnforced(account)) {
          samlRequiredScope.push(account);
        } else {
          scope.push(account);
        }
        break;
      }
      default:
        assertNever(account.type);
    }
  }

  return { scope, samlTeamIds, samlRequiredScope };
}
