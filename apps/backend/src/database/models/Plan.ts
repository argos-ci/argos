import { firstUpper } from "@/util/string.js";
import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

const FREE_PLAN_NAME = "free";

export class Plan extends Model {
  static override tableName = "plans";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [
      "name",
      "includedScreenshots",
      "usageBased",
      "githubSsoIncluded",
      "fineGrainedAccessControlIncluded",
    ],
    properties: {
      name: { type: "string" },
      includedScreenshots: { type: "number" },
      githubPlanId: { type: "number" },
      stripeProductId: { type: "string" },
      usageBased: { type: "boolean" },
      githubSsoIncluded: { type: "boolean" },
      fineGrainedAccessControlIncluded: { type: "boolean" },
    },
  });

  name!: string;
  includedScreenshots!: number;
  githubPlanId!: number;
  stripeProductId!: string;
  usageBased!: boolean;
  githubSsoIncluded!: boolean;
  fineGrainedAccessControlIncluded!: boolean;

  static override virtualAttributes = ["displayName"];

  get displayName() {
    return firstUpper(this.name);
  }

  static async getFreePlan(): Promise<Plan | null> {
    const plan = await Plan.query().findOne({ name: FREE_PLAN_NAME });
    return plan ?? null;
  }

  static checkIsFreePlan(plan: Plan) {
    return plan.name === FREE_PLAN_NAME;
  }
}
