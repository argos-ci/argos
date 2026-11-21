import { TEAM_AUTH_METHOD_REQUIRED_CODES } from "@argos/schemas/team-auth-method";

import { TeamAuthMethod } from "@/gql/graphql";

import { checkIsErrorCode } from "./error";

/**
 * The sign-in method a team asks for, when `error` keeps a member out of it.
 */
export function getRequiredTeamAuthMethod(
  error: unknown,
): TeamAuthMethod | null {
  return (
    Object.values(TeamAuthMethod).find((authMethod) =>
      checkIsErrorCode(error, TEAM_AUTH_METHOD_REQUIRED_CODES[authMethod]),
    ) ?? null
  );
}
