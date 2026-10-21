import type { RelationMappings } from "objection";

import { generateRandomString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Team } from "./Team";

const TeamScimTokenPrefix = "argos_scim_";

/**
 * The token a team's Identity Provider authenticates with on the SCIM API.
 * A team has at most one: generating a new one replaces it.
 */
export class TeamScimToken extends Model {
  static override tableName = "team_scim_tokens";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["teamId", "tokenHash"],
        properties: {
          teamId: { type: "string" },
          tokenHash: { type: "string", minLength: 64, maxLength: 64 },
          lastUsedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  teamId!: string;
  tokenHash!: string;
  lastUsedAt!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: "team_scim_tokens.teamId",
          to: "teams.id",
        },
      },
    };
  }

  team?: Team;

  static generateToken() {
    return `${TeamScimTokenPrefix}${generateRandomString(40)}`;
  }

  static isScimToken(token: string): boolean {
    return token.startsWith(TeamScimTokenPrefix);
  }
}
