import { RelationMappings } from "objection";
import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { User } from "./User.js";
import { Team } from "./Team.js";

export class TeamUser extends Model {
  static override tableName = "team_users";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["userId", "teamId", "userLevel"],
    properties: {
      userId: { type: "string" },
      teamId: { type: "string" },
      userLevel: { type: "string", enum: ["member", "owner"] },
    },
  });

  userId!: string;
  teamId!: string;
  userLevel!: "member" | "owner";

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
