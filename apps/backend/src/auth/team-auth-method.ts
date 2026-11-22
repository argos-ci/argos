import type { AuthMethod } from "@argos/schemas/auth-method";
import type { TeamAuthMethod } from "@argos/schemas/team-auth-method";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { Account, Team, TeamDomain, User } from "@/database/models";

import { checkTeamSamlEnabled } from "./saml";

type TeamRequirement = Pick<
  Team,
  "id" | "enforcedAuthMethod" | "ssoGithubAccountId"
>;

/**
 * Whether the user's account for `authMethod` is one of the team's, so leaving
 * the company is leaving the team: a Google Workspace account on one of the
 * team's domains, or a GitHub account in the team's GitHub SSO organization.
 * A SAML login was vouched for by the team's own IdP.
 */
export async function checkAccountBelongsToTeam(input: {
  teamId: string;
  userId: string;
  authMethod: TeamAuthMethod;
}): Promise<boolean> {
  const { teamId, userId, authMethod } = input;
  switch (authMethod) {
    case "saml":
      return true;
    case "google": {
      // The user's linked Google account is the one any Google sign-in used:
      // signing in with another one opens another Argos account.
      const match = await User.query()
        .select("users.id")
        .joinRelated("googleUser")
        .join("team_domains", "team_domains.domain", "googleUser.hostedDomain")
        .where("users.id", userId)
        .where("team_domains.teamId", teamId)
        .first();
      return Boolean(match);
    }
    case "github": {
      const match = await Team.query()
        .select("teams.id")
        .joinRelated("ssoGithubAccount.members")
        .join(
          "accounts",
          "accounts.githubAccountId",
          "ssoGithubAccount:members.githubMemberId",
        )
        .where("teams.id", teamId)
        .where("accounts.userId", userId)
        .first();
      return Boolean(match);
    }
    default:
      return assertNever(authMethod);
  }
}

/**
 * Whether the team has what members need to meet `authMethod`: SAML enabled
 * and on its plan, a domain, or GitHub SSO.
 */
export async function checkTeamAuthMethodAvailable(
  team: Pick<Team, "id" | "ssoGithubAccountId">,
  authMethod: TeamAuthMethod,
): Promise<boolean> {
  switch (authMethod) {
    case "saml": {
      const account = await Account.query()
        .findOne({ "accounts.teamId": team.id })
        .withGraphJoined("teamSamlConfig");
      invariant(account, "Team account not found");
      // Spares the plan lookup for a team with SAML off.
      if (!account.teamSamlConfig?.enabled) {
        return false;
      }
      const { enabled } = await checkTeamSamlEnabled(account);
      return enabled;
    }
    case "google": {
      const domain = await TeamDomain.query()
        .select("id")
        .findOne({ teamId: team.id });
      return Boolean(domain);
    }
    case "github":
      return team.ssoGithubAccountId !== null;
    default:
      return assertNever(authMethod);
  }
}

/**
 * The method keeping a member signed in with `signedInWith` out of the team,
 * if any. A requirement survives the team losing what members need to meet
 * it, and only counts while they can: otherwise it would lock every member
 * out, admins included.
 */
export async function getUnmetTeamAuthMethod(input: {
  team: TeamRequirement;
  userId: string;
  signedInWith: AuthMethod | null;
}): Promise<TeamAuthMethod | null> {
  const { team, userId, signedInWith } = input;
  const required = team.enforcedAuthMethod;
  if (!required) {
    return null;
  }
  if (
    signedInWith === required &&
    (await checkAccountBelongsToTeam({
      teamId: team.id,
      userId,
      authMethod: required,
    }))
  ) {
    return null;
  }
  return (await checkTeamAuthMethodAvailable(team, required)) ? required : null;
}
