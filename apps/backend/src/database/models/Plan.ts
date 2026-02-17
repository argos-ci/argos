import { firstUpper } from "@argos/util/string";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import type { SubscriptionInterval } from "./Subscription";

const FREE_PLAN_NAME = "free";

export class Plan extends Model {
  static override tableName = "plans";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["name", "includedScreenshots", "usageBased", "interval"],
        properties: {
          name: { type: "string" },
          includedScreenshots: { type: "number" },
          githubPlanId: { type: ["number", "null"] },
          stripeProductId: { type: ["string", "null"] },
          usageBased: { type: "boolean" },
          githubSsoIncluded: { type: "boolean" },
          fineGrainedAccessControlIncluded: { type: "boolean" },
          samlIncluded: { type: "boolean" },
          interval: { type: "string", enum: ["month", "year"] },
        },
      },
    ],
  };

  name!: string;
  includedScreenshots!: number;
  githubPlanId!: number | null;
  stripeProductId!: string | null;
  usageBased!: boolean;
  githubSsoIncluded!: boolean;
  fineGrainedAccessControlIncluded!: boolean;
  samlIncluded!: boolean;
  interval!: SubscriptionInterval;

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
