import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import {
  Account,
  AccountPermission,
  ALL_ACCOUNT_PERMISSIONS,
} from "./Account.js";
import { GitlabUser } from "./GitlabUser.js";
import { GoogleUser } from "./GoogleUser.js";
import { Team } from "./Team.js";

export class User extends Model {
  static override tableName = "users";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        properties: {
          email: {
            anyOf: [{ type: "string", format: "email" }, { type: "null" }],
          },
          gitlabUserId: { type: ["string", "null"] },
          googleUserId: { type: ["string", "null"] },
          staff: { type: "boolean" },
        },
      },
    ],
  };

  email!: string | null;
  gitlabUserId!: string | null;
  googleUserId!: string | null;
  staff!: boolean;

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "users.id",
          to: "accounts.userId",
        },
      },
      ownedTeams: {
        relation: Model.ManyToManyRelation,
        modelClass: Team,
        join: {
          from: "users.id",
          through: {
            from: "team_users.userId",
            to: "team_users.teamId",
          },
          to: "teams.id",
        },
        modify: (query) => query.where({ "team_users.userLevel": "owner" }),
      },
      teams: {
        relation: Model.ManyToManyRelation,
        modelClass: Team,
        join: {
          from: "users.id",
          through: {
            from: "team_users.userId",
            to: "team_users.teamId",
          },
          to: "teams.id",
        },
      },
      gitlabUser: {
        relation: Model.HasOneRelation,
        modelClass: GitlabUser,
        join: {
          from: "users.gitlabUserId",
          to: "gitlab_users.id",
        },
      },
      googleUser: {
        relation: Model.HasOneRelation,
        modelClass: GoogleUser,
        join: {
          from: "users.googleUserId",
          to: "google_users.id",
        },
      },
    };
  }

  account?: Account;
  teams?: Team[];
  ownedTeams?: Team[];
  gitlabUser?: GitlabUser;
  googleUser?: GoogleUser;

  static getPermissions(
    userId: string,
    user: User | null,
  ): AccountPermission[] {
    if (!user) {
      return [];
    }
    if (user.staff) {
      return ALL_ACCOUNT_PERMISSIONS;
    }
    if (userId === user.id) {
      return ALL_ACCOUNT_PERMISSIONS;
    }
    return [];
  }
}
