import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Team } from "./Team";

export class TeamDomain extends Model {
  static override tableName = "team_domains";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["teamId", "domain"],
        properties: {
          teamId: { type: "string" },
          domain: { type: "string" },
        },
      },
    ],
  };

  declare teamId: string;
  declare domain: string;

  static override get relationMappings(): RelationMappings {
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: "team_domains.teamId",
          to: "teams.id",
        },
      },
    };
  }

  declare team?: Team;
}
