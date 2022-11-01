import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class Plan extends Model {
  static override tableName = "plans";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "screenshotsLimitPerMonth", "githubId"],
    properties: {
      name: { type: "string" },
      screenshotsLimitPerMonth: { type: "number" },
      githubId: { type: "number" },
    },
  });

  name!: string;
  screenshotsLimitPerMonth!: number;
  githubId!: number;

  static async getFreePlan(): Promise<Plan | null> {
    const freePlan = await Plan.query().findOne({ name: "free" });
    return freePlan ?? null;
  }
}
