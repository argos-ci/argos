import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class VercelConfiguration extends Model {
  static override tableName = "vercel_configurations";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["vercelId"],
    properties: {
      vercelId: { type: "string" },
      deleted: { type: "boolean" },
      vercelAccessToken: { type: ["string", "null"] },
      vercelTeamId: { type: ["string", "null"] },
    },
  });

  vercelId!: string;
  vercelAccessToken!: string | null;
  vercelTeamId!: string | null;
}
