import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class Plan extends Model {
  static override tableName = "plans";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "includedScreenshots", "usageBased"],
    properties: {
      name: { type: "string" },
      includedScreenshots: { type: "number" },
      githubPlanId: { type: "number" },
      stripeProductId: { type: "string" },
      usageBased: { type: "boolean" },
    },
  });

  name!: string;
  includedScreenshots!: number;
  githubPlanId!: number;
  stripeProductId!: string;
  usageBased!: boolean;

  static async getFreePlan(): Promise<Plan | null> {
    const plan = await Plan.query().findOne({ name: "free" });
    return plan ?? null;
  }

  static checkIsFreePlan(plan: Plan | null) {
    return !plan || plan?.name === "free";
  }
}
