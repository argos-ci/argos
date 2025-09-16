import { Model, type JSONSchema, type RelationMappings } from "objection";
import { z } from "zod";

import { generateRandomHexString } from "../services/crypto.js";
import { Team } from "./Team.js";
import { TeamUserLevelSchema } from "./TeamUser.js";

export class TeamInvite extends Model {
  static override tableName = "team_invites";

  static override get idColumn() {
    return ["email", "teamId"];
  }

  static override jsonSchema = {
    type: "object",
    required: ["expiresAt", "secret", "email", "teamId", "userLevel"],
    properties: {
      createdAt: { type: "string" },
      expiresAt: { type: "string" },
      secret: { type: "string", minLength: 20, maxLength: 20 },
      email: { type: "string", format: "email" },
      teamId: { type: "string" },
      userLevel: z.toJSONSchema(TeamUserLevelSchema) as JSONSchema,
    },
  };

  createdAt!: string;
  expiresAt!: string;
  secret!: string;
  email!: string;
  teamId!: string;
  userLevel!: z.infer<typeof TeamUserLevelSchema>;

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
    };
  }

  team?: Team;

  /**
   * Generate the invite secret.
   */
  static generateSecret() {
    return generateRandomHexString(20);
  }
}
