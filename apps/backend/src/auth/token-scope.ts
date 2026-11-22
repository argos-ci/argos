import type { AuthMethod } from "@argos/schemas/auth-method";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import type { Account, User } from "@/database/models";

import type { RestrictedScopeEntry, TokenTeamAuthMethod } from "./payload";
import { getUnmetTeamAuthMethod } from "./team-auth-method";

/**
 * What a user's token reaches, from the accounts it was issued for. Expects
 * each entry's `account` and the user's `teams` to be fetched.
 */
export async function resolveTokenScope(
  user: User,
  entries: { account?: Account; authMethod: AuthMethod | null }[],
): Promise<{
  /** Accounts the token may act on. */
  scope: Account[];
  teamAuthMethods: TokenTeamAuthMethod[];
  restrictedScope: RestrictedScopeEntry[];
}> {
  invariant(user.teams, "user teams not fetched");
  const userTeams = new Map(user.teams.map((team) => [team.id, team]));
  const scope: Account[] = [];
  const teamAuthMethods: TokenTeamAuthMethod[] = [];
  const restrictedScope: RestrictedScopeEntry[] = [];

  for (const { account, authMethod } of entries) {
    invariant(account, "scope account not fetched");
    switch (account.type) {
      case "user": {
        if (account.userId === user.id) {
          scope.push(account);
        }
        break;
      }
      case "team": {
        const { teamId } = account;
        invariant(teamId);
        const team = userTeams.get(teamId);
        // A team the user has left is out of the scope, silently.
        if (!team) {
          break;
        }
        if (authMethod) {
          teamAuthMethods.push({ teamId, authMethod });
        }
        const requiredAuthMethod = await getUnmetTeamAuthMethod({
          team,
          userId: user.id,
          signedInWith: authMethod,
        });
        if (requiredAuthMethod) {
          restrictedScope.push({ account, requiredAuthMethod });
        } else {
          scope.push(account);
        }
        break;
      }
      default:
        assertNever(account.type);
    }
  }

  return { scope, teamAuthMethods, restrictedScope };
}
