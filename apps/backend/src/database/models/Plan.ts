import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class Plan extends Model {
  static override tableName = "plans";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "screenshotsLimitPerMonth", "githubId", "usageBased"],
    properties: {
      name: { type: "string" },
      screenshotsLimitPerMonth: { type: "number" },
      githubId: { type: "number" },
      stripePlanId: { type: "string" },
      usageBased: { type: "boolean" },
    },
  });

  name!: string;
  screenshotsLimitPerMonth!: number;
  githubId!: number;
  stripePlanId!: string;
  usageBased!: boolean;

  static getScreenshotMonthlyLimitForPlan(plan: Plan | null) {
    if (!plan) {
      return 0;
    }

    if (plan.usageBased) {
      return null;
    }

    return plan.screenshotsLimitPerMonth;
  }

  static async getFreePlan(): Promise<Plan | null> {
    const plan = await Plan.query().findOne({ name: "free" });
    return plan ?? null;
  }

  static checkIsFreePlan(plan: Plan | null) {
    return !plan || plan?.name === "free";
  }
}
