import {
  TEAM_AUTH_METHOD_REQUIRED_CODES,
  TEAM_AUTH_METHOD_REQUIREMENTS,
  TeamAuthMethodSchema,
  type TeamAuthMethod,
} from "@argos/schemas/team-auth-method";
import { TeamUserLevelSchema } from "@argos/schemas/team-user-level";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type { RelationMappings } from "objection";

import type { AuthMethod } from "@/auth/auth-method";
import { getAuthMethodForTeam, type AuthViewer } from "@/auth/payload";
import { checkTeamSamlEnabled } from "@/auth/saml";
import config from "@/config";
import { boom } from "@/util/error";

import { generateRandomString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account, AccountPermission, ALL_ACCOUNT_PERMISSIONS } from "./Account";
import { GithubAccount } from "./GithubAccount";
import { TeamDomain } from "./TeamDomain";
import { TeamUser } from "./TeamUser";
import { User } from "./User";

/**
 * How a request reaches a team. A member is kept out like an outsider while
 * the team requires a sign-in method the request did not go through;
 * `auth_method_required` lets the entry points tell them which one.
 */
export type TeamAccess =
  | { type: "member"; userLevel: TeamUser["userLevel"] }
  | { type: "outsider" }
  | { type: "auth_method_required"; authMethod: TeamAuthMethod };

function getTeamUserLevelPermissions(
  level: TeamUser["userLevel"],
): AccountPermission[] {
  switch (level) {
    case "owner":
      return ALL_ACCOUNT_PERMISSIONS;
    case "billing":
      return ["billing", "view"];
    case "member":
    case "contributor":
      return ["view"];
    default:
      assertNever(level);
  }
}

/**
 * The team roles granted `permission`, so the members it reaches can be
 * listed with the same rule that guards it.
 */
export function getTeamUserLevelsWithPermission(
  permission: AccountPermission,
): TeamUser["userLevel"][] {
  return TeamUserLevelSchema.options.filter((level) =>
    getTeamUserLevelPermissions(level).includes(permission),
  );
}

export class Team extends Model {
  static override tableName = "teams";

  static override deterministicEncryptedAttributes = ["inviteSecret"];

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["defaultUserLevel"],
        properties: {
          inviteSecret: { type: ["null", "string"] },
          ssoGithubAccountId: { type: ["null", "string"] },
          samlPurchased: { type: "boolean" },
          staticIpEnabled: { type: "boolean" },
          defaultUserLevel: { type: "string", enum: ["member", "contributor"] },
          enforcedAuthMethod: {
            type: ["string", "null"],
            enum: [...TeamAuthMethodSchema.options, null],
          },
        },
      },
    ],
  };

  inviteSecret!: string | null;
  ssoGithubAccountId!: string | null;
  samlPurchased!: boolean;
  /**
   * Whether Argos reaches GitHub from its static IP addresses for the
   * installations this team's projects use.
   */
  staticIpEnabled!: boolean;
  defaultUserLevel!: "member" | "contributor";
  /**
   * The sign-in method members must use to reach the team. See
   * {@link checkEnforcedAuthMethodApplies} for when it applies.
   */
  enforcedAuthMethod!: TeamAuthMethod | null;

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "teams.id",
          to: "accounts.teamId",
        },
      },
      owners: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: "teams.id",
          through: {
            from: "team_users.teamId",
            to: "team_users.userId",
          },
          to: "users.id",
        },
        filter: (query) => query.where({ "team_users.userLevel": "owner" }),
      },
      teamUsers: {
        relation: Model.HasManyRelation,
        modelClass: TeamUser,
        join: {
          from: "teams.id",
          to: "team_users.teamId",
        },
      },
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: "teams.id",
          through: {
            from: "team_users.teamId",
            to: "team_users.userId",
          },
          to: "users.id",
        },
      },
      ssoGithubAccount: {
        relation: Model.HasOneRelation,
        modelClass: GithubAccount,
        join: {
          from: "teams.ssoGithubAccountId",
          to: "github_accounts.id",
        },
      },
    };
  }

  account?: Account;
  users?: User[];
  owners?: User[];
  ssoGithubAccount?: GithubAccount | null;

  /**
   * Generate the invite secret.
   */
  static generateInviteSecret() {
    return generateRandomString(20);
  }

  /**
   * Generate an invite link for the team.
   */
  async $getInviteLink() {
    if (!this.inviteSecret) {
      this.inviteSecret = Team.generateInviteSecret();
      await Team.query()
        .findById(this.id)
        .patch({ inviteSecret: this.inviteSecret });
    }
    return new URL(
      `/teams/invite/${this.inviteSecret}`,
      config.get("server.url"),
    ).href;
  }

  /**
   * How `auth` reaches the team. Every permission on a team or its projects
   * derives from this, which is what makes a required sign-in method hold
   * everywhere.
   */
  static async getAccess(
    teamId: string,
    auth: AuthViewer,
  ): Promise<TeamAccess> {
    const teamUser = await TeamUser.query()
      .select(
        "team_users.userLevel",
        "teams.enforcedAuthMethod",
        "team_saml_configs.enabled as samlEnabled",
      )
      .join("teams", "teams.id", "team_users.teamId")
      .join("accounts", "accounts.teamId", "team_users.teamId")
      .leftJoin(
        "team_saml_configs",
        "team_saml_configs.accountId",
        "accounts.id",
      )
      .where("team_users.teamId", teamId)
      .where("team_users.userId", auth.user.id)
      .first()
      .castTo<
        | {
            userLevel: TeamUser["userLevel"];
            enforcedAuthMethod: TeamAuthMethod | null;
            samlEnabled: boolean | null;
          }
        | undefined
      >();

    if (!teamUser) {
      return { type: "outsider" };
    }

    const { enforcedAuthMethod } = teamUser;
    if (
      enforcedAuthMethod &&
      !(await checkSignInMeetsTeamRequirement({
        teamId,
        userId: auth.user.id,
        signedInWith: getAuthMethodForTeam(auth, teamId),
        required: enforcedAuthMethod,
      })) &&
      (await checkEnforcedAuthMethodApplies({
        teamId,
        authMethod: enforcedAuthMethod,
        samlEnabled: Boolean(teamUser.samlEnabled),
      }))
    ) {
      return { type: "auth_method_required", authMethod: enforcedAuthMethod };
    }

    return { type: "member", userLevel: teamUser.userLevel };
  }

  /**
   * Throw when `auth` is a member kept out of the team by its required sign-in
   * method, with a code naming the method. For entry points that found nothing
   * to show, so the member is prompted to sign in instead of being told it
   * does not exist.
   */
  static async assertAuthMethodSatisfied(
    teamId: string | null,
    auth: AuthViewer | null,
  ): Promise<void> {
    if (!teamId || !auth) {
      return;
    }
    const access = await Team.getAccess(teamId, auth);
    if (access.type === "auth_method_required") {
      const account = await Account.query()
        .select("slug")
        .findOne({ teamId })
        .throwIfNotFound();
      throw boom(
        403,
        `This team requires sign-in with ${TEAM_AUTH_METHOD_REQUIREMENTS[access.authMethod]}. Sign in with it to access the team.`,
        {
          code: TEAM_AUTH_METHOD_REQUIRED_CODES[access.authMethod],
          accountSlug: account.slug,
        },
      );
    }
  }

  /**
   * Get permissions for a request in a team.
   */
  static async getPermissions(
    teamId: string,
    auth: AuthViewer | null,
  ): Promise<AccountPermission[]> {
    if (!auth) {
      return [];
    }

    if (auth.user.staff) {
      return ALL_ACCOUNT_PERMISSIONS;
    }

    const access = await Team.getAccess(teamId, auth);
    if (access.type !== "member") {
      return [];
    }

    return getTeamUserLevelPermissions(access.userLevel);
  }

  /**
   * Get the user IDs of the team members granted `permission`.
   */
  static async getUserIdsWithPermission(
    teamId: string,
    permission: AccountPermission,
  ): Promise<string[]> {
    const teamUsers = await TeamUser.query()
      .select("userId")
      .where({ teamId })
      .whereIn("userLevel", getTeamUserLevelsWithPermission(permission));
    return teamUsers.map((teamUser) => teamUser.userId);
  }
}

/**
 * Whether signing in with `signedInWith` lets `userId` reach a team requiring
 * `required`. Google and GitHub count only with the team's own accounts, so
 * leaving the company is leaving the team: a Google Workspace account on one
 * of the team's domains, or a GitHub account in the team's GitHub SSO
 * organization. A SAML login was vouched for by the team's own IdP.
 */
export async function checkSignInMeetsTeamRequirement(input: {
  teamId: string;
  userId: string;
  signedInWith: AuthMethod | null;
  required: TeamAuthMethod;
}): Promise<boolean> {
  const { teamId, userId, signedInWith, required } = input;
  if (signedInWith !== required) {
    return false;
  }
  switch (required) {
    case "saml":
      return true;
    case "google": {
      // The user's linked Google account is the one any Google sign-in used:
      // signing in with another one opens another Argos account.
      const match = await User.query()
        .select("users.id")
        .join("google_users", "google_users.id", "users.googleUserId")
        .join(
          "team_domains",
          "team_domains.domain",
          "google_users.hostedDomain",
        )
        .where("users.id", userId)
        .where("team_domains.teamId", teamId)
        .first();
      return Boolean(match);
    }
    case "github": {
      const match = await Team.query()
        .select("teams.id")
        .join(
          "github_account_members",
          "github_account_members.githubAccountId",
          "teams.ssoGithubAccountId",
        )
        .join(
          "accounts",
          "accounts.githubAccountId",
          "github_account_members.githubMemberId",
        )
        .where("teams.id", teamId)
        .where("accounts.userId", userId)
        .first();
      return Boolean(match);
    }
    default:
      return assertNever(required);
  }
}

/**
 * Whether a team's required sign-in method applies. It survives the team
 * losing what members need to meet it (SAML turned off or off the plan, the
 * last domain removed, GitHub SSO turned off) and only counts while they can:
 * otherwise it would lock every member out, admins included.
 */
export async function checkEnforcedAuthMethodApplies(input: {
  teamId: string;
  authMethod: TeamAuthMethod;
  /** Whether the team's SAML configuration is enabled, which spares the plan lookup when it is not. */
  samlEnabled: boolean;
}): Promise<boolean> {
  const { teamId, authMethod } = input;
  switch (authMethod) {
    case "saml":
      return input.samlEnabled && checkTeamSamlUsable(teamId);
    case "google": {
      const domain = await TeamDomain.query().select("id").findOne({ teamId });
      return Boolean(domain);
    }
    case "github": {
      const team = await Team.query()
        .select("id")
        .findById(teamId)
        .whereNotNull("ssoGithubAccountId");
      return Boolean(team);
    }
    default:
      return assertNever(authMethod);
  }
}

/**
 * Whether members can log in to the team with SAML. See
 * {@link checkTeamSamlEnabled}.
 */
async function checkTeamSamlUsable(teamId: string): Promise<boolean> {
  const account = await Account.query()
    .findOne({ "accounts.teamId": teamId })
    .withGraphJoined("teamSamlConfig");
  invariant(account, "Team account not found");
  const { enabled } = await checkTeamSamlEnabled(account);
  return enabled;
}
