import type { RelationMappings } from "objection";

import config from "@argos-ci/config";

import { generateRandomHexString } from "../services/crypto.js";
import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { TeamUser } from "./TeamUser.js";
import { User } from "./User.js";

export class Team extends Model {
  static override tableName = "teams";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [],
    properties: {
      inviteSecret: { type: ["null", "string"] },
    },
  });

  inviteSecret!: string | null;

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
    };
  }

  account?: Account;
  users?: User[];

  static generateInviteToken(payload: {
    teamId: string;
    secret: string;
  }): string {
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
  }

  static parseInviteToken(
    token: string
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
