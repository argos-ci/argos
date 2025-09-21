import { Model, type JSONSchema, type RelationMappings } from "objection";
import { z } from "zod";

import { TeamUserLevelSchema } from "../schemas/TeamUserLevel.js";
import { generateRandomHexString } from "../services/crypto.js";
import { Team } from "./Team.js";
import { User } from "./User.js";

export class TeamInvite extends Model {
  static override tableName = "team_invites";

  static override get idColumn() {
    return ["teamId", "email"];
  }

  static override jsonSchema = {
    type: "object",
    required: [
      "expiresAt",
      "secret",
      "email",
      "teamId",
      "userLevel",
      "invitedById",
    ],
    properties: {
      createdAt: { type: "string" },
      expiresAt: { type: "string" },
      secret: { type: "string", minLength: 20, maxLength: 20 },
      email: { type: "string", format: "email" },
      teamId: { type: "string" },
      userLevel: z.toJSONSchema(TeamUserLevelSchema) as JSONSchema,
      invitedById: { type: "string" },
    },
  };

  createdAt!: string;
  expiresAt!: string;
  secret!: string;
  email!: string;
  teamId!: string;
  userLevel!: z.infer<typeof TeamUserLevelSchema>;
  invitedById!: string;

  static override get relationMappings(): RelationMappings {
    return {
      team: {
        relation: Model.HasOneRelation,
        modelClass: Team,
        join: {
          from: "team_invites.teamId",
          to: "teams.id",
        },
      },
      invitedBy: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "team_invites.invitedById",
          to: "users.id",
        },
      },
    };
  }

  team?: Team;
  invitedBy?: User;

  /**
   * Generate the invite secret.
   */
  static generateSecret() {
    return generateRandomHexString(20);
  }

  static formatId(teamInvite: TeamInvite) {
    return Buffer.from(
      [teamInvite.teamId, teamInvite.email].join(":"),
    ).toString("base64url");
  }

  static parseId(id: string) {
    const [teamId, email] = Buffer.from(id, "base64url")
      .toString("utf-8")
      .split(":");

    if (!teamId || !email) {
      return null;
    }

    return { teamId, email };
  }
}
