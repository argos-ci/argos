import { assertNever } from "@argos/util/assertNever";
import type { RelationMappings } from "objection";

import config from "@/config/index.js";

import { generateRandomHexString } from "../services/crypto.js";
import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import {
  Account,
  AccountPermission,
  ALL_ACCOUNT_PERMISSIONS,
} from "./Account.js";
import { GithubAccount } from "./GithubAccount.js";
import { TeamUser } from "./TeamUser.js";
import { User } from "./User.js";

export class Team extends Model {
  static override tableName = "teams";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["defaultUserLevel"],
        properties: {
          inviteSecret: { type: ["null", "string"] },
          ssoGithubAccountId: { type: ["null", "string"] },
          defaultUserLevel: { type: "string", enum: ["member", "contributor"] },
        },
      },
    ],
  };

  inviteSecret!: string | null;
  ssoGithubAccountId!: string | null;
  defaultUserLevel!: "member" | "contributor";

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
    return generateRandomHexString(20);
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
   * Get permissions for a user in a team.
   */
  static async getPermissions(
    teamId: string,
    user: User | null,
  ): Promise<AccountPermission[]> {
    if (!user) {
      return [];
    }

    if (user.staff) {
      return ALL_ACCOUNT_PERMISSIONS;
    }

    const teamUser = await TeamUser.query()
      .select("id", "userLevel")
      .findOne({ userId: user.id, teamId: teamId });

    if (!teamUser) {
      return [];
    }

    switch (teamUser.userLevel) {
      case "owner":
        return ALL_ACCOUNT_PERMISSIONS;
      case "member":
      case "contributor":
        return ["view"];
      default:
        assertNever(teamUser.userLevel);
    }
  }

  /**
   * Get the user IDs of the owners of a team.
   */
  static async getOwnerIds(teamId: string): Promise<string[]> {
    const teamUsers = await TeamUser.query()
      .select("userId")
      .where({ teamId, userLevel: "owner" });
    return teamUsers.map((teamUser) => teamUser.userId);
  }
}
