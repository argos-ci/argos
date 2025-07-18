import { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { Team } from "./Team.js";
import { User } from "./User.js";

export class TeamUser extends Model {
  static override tableName = "team_users";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["userId", "teamId", "userLevel"],
        properties: {
          userId: { type: "string" },
          teamId: { type: "string" },
          userLevel: {
            type: "string",
            enum: ["owner", "member", "contributor"],
          },
        },
      },
    ],
  };

  userId!: string;
  teamId!: string;
  userLevel!: "owner" | "member" | "contributor";

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "team_users.userId",
          to: "users.id",
        },
      },
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: "team_users.teamId",
          to: "teams.id",
        },
      },
    };
  }
}
