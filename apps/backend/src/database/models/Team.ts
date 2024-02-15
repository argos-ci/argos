import type { RelationMappings } from "objection";

import config from "@/config/index.js";

import { generateRandomHexString } from "../services/crypto.js";
import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { TeamUser } from "./TeamUser.js";
import { User } from "./User.js";
import { GithubAccount } from "./GithubAccount.js";

export class Team extends Model {
  static override tableName = "teams";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [],
    properties: {
      inviteSecret: { type: ["null", "string"] },
      ssoGithubAccountId: { type: ["null", "string"] },
    },
  });

  inviteSecret!: string | null;
  ssoGithubAccountId!: string | null;

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

  static generateInviteToken(payload: {
    teamId: string;
    secret: string;
  }): string {
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
  }

  static parseInviteToken(
    token: string,
  ): { teamId: string; secret: string } | null {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    try {
      const payload = JSON.parse(raw);
      if (typeof payload.teamId !== "string") {
        return null;
      }
      if (typeof payload.secret !== "string") {
        return null;
      }
      return {
        teamId: payload.teamId,
        secret: payload.secret,
      };
    } catch {
      return null;
    }
  }

  static async verifyInviteToken(token: string): Promise<Team | null> {
    const payload = Team.parseInviteToken(token);
    if (!payload) {
      return null;
    }
    const team = await Team.query().findById(payload.teamId);

    if (!team) {
      return null;
    }

    if (team.inviteSecret !== payload.secret) {
      return null;
    }
    return team;
  }

  async $checkWritePermission(user: User) {
    return Team.checkWritePermission(this.id, user);
  }

  static async checkWritePermission(teamId: string, user: User) {
    if (!user) return false;
    if (user.staff) return true;
    const teamUser = await TeamUser.query()
      .select("id")
      .findOne({ userId: user.id, teamId: teamId, userLevel: "owner" });
    return Boolean(teamUser);
  }

  async $checkReadPermission(user: User) {
    return Team.checkReadPermission(this.id, user);
  }

  static async checkReadPermission(teamId: string, user: User) {
    if (!user) return false;
    if (user.staff) return true;
    const teamUser = await TeamUser.query()
      .select("id")
      .findOne({ userId: user.id, teamId: teamId });
    return Boolean(teamUser);
  }

  async $getInviteLink() {
    if (!this.inviteSecret) {
      this.inviteSecret = await generateRandomHexString();
      await Team.query()
        .findById(this.id)
        .patch({ inviteSecret: this.inviteSecret });
    }
    const payload = {
      teamId: this.id,
      secret: this.inviteSecret,
    };
    const token = Team.generateInviteToken(payload);
    return new URL(`/invite/${token}`, config.get("server.url")).href;
  }
}
