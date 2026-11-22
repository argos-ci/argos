import { CombinedGraphQLErrors } from "@apollo/client";
import { TEAM_AUTH_METHOD_REQUIRED_CODES } from "@argos/schemas/team-auth-method";

import { TeamAuthMethod } from "@/gql/graphql";

/**
 * The sign-in a team asks for, when `error` keeps a member out of it. The team
 * comes with the error: it is not always the one the page shows.
 */
export function getRequiredTeamSignIn(
  error: unknown,
): { authMethod: TeamAuthMethod; teamSlug: string } | null {
  if (!CombinedGraphQLErrors.is(error)) {
    return null;
  }
  for (const { extensions } of error.errors) {
    const authMethod = Object.values(TeamAuthMethod).find(
      (method) =>
        extensions?.argosErrorCode === TEAM_AUTH_METHOD_REQUIRED_CODES[method],
    );
    const teamSlug = extensions?.accountSlug;
    if (authMethod && typeof teamSlug === "string") {
      return { authMethod, teamSlug };
    }
  }
  return null;
}
