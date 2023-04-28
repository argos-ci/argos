import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class VercelProjectConfiguration extends Model {
  static override tableName = "vercel_project_configurations";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["vercelProjectId", "vercelConfigurationId"],
    properties: {
      vercelProjectId: { type: "string" },
      vercelConfigurationId: { type: "string" },
    },
  });

  vercelProjectId!: string;
  vercelConfigurationId!: string;
}
