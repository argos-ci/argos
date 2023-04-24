import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

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
}
