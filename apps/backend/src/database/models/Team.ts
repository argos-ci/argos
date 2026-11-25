import {
  TeamAuthMethodSchema,
  type TeamAuthMethod,
} from "@argos/schemas/team-auth-method";
import { TeamUserLevelSchema } from "@argos/schemas/team-user-level";
import { assertNever } from "@argos/util/assertNever";
import type { RelationMappings } from "objection";

import { getAuthMethodForTeam, type AuthViewer } from "@/auth/payload";
import { getUnmetTeamAuthMethod } from "@/auth/team-auth-method";
import config from "@/config";

import { generateRandomString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account, AccountPermission, ALL_ACCOUNT_PERMISSIONS } from "./Account";
import { GithubAccount } from "./GithubAccount";
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
   * `getUnmetTeamAuthMethod` for when it applies.
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

  // The team's account is created with the team, in one transaction.
  // oxlint-disable-next-line argos/relation-matches-schema
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
        "teams.ssoGithubAccountId",
      )
      .join("teams", "teams.id", "team_users.teamId")
      .where("team_users.teamId", teamId)
      .where("team_users.userId", auth.user.id)
      .first()
      .castTo<
        | (Pick<TeamUser, "userLevel"> &
            Pick<Team, "enforcedAuthMethod" | "ssoGithubAccountId">)
        | undefined
      >();

    if (!teamUser) {
      return { type: "outsider" };
    }

    const unmetAuthMethod = await getUnmetTeamAuthMethod({
      team: {
        id: teamId,
        enforcedAuthMethod: teamUser.enforcedAuthMethod,
        ssoGithubAccountId: teamUser.ssoGithubAccountId,
      },
      userId: auth.user.id,
      signedInWith: getAuthMethodForTeam(auth, teamId),
    });
    if (unmetAuthMethod) {
      return { type: "auth_method_required", authMethod: unmetAuthMethod };
    }

    return { type: "member", userLevel: teamUser.userLevel };
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
