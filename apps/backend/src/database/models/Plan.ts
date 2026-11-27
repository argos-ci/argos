import { firstUpper } from "@argos/util/string";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import type { SubscriptionInterval } from "./Subscription";

const FREE_PLAN_NAME = "free";
const PRO_PLAN_NAME = "pro";
/**
 * The plans sales contracts are billed on, by the exact name each was created
 * with: the yearly one is spelled the French way. A new Enterprise plan is
 * added here.
 */
const ENTERPRISE_PLAN_NAMES = new Set(["enterprise", "Entreprise Annual"]);
/** The plan staff grant a team evaluating Enterprise. */
const ENTERPRISE_TRIAL_PLAN_NAME = "enterprise-trial";

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
          githubMonthlyPriceCents: { type: ["number", "null"] },
          stripeProductId: { type: ["string", "null"] },
          usageBased: { type: "boolean" },
          githubSsoIncluded: { type: "boolean" },
          fineGrainedAccessControlIncluded: { type: "boolean" },
          samlIncluded: { type: "boolean" },
          customDomainsIncluded: { type: "boolean" },
          staticIpIncluded: { type: "boolean" },
          interval: { type: "string", enum: ["month", "year"] },
        },
      },
    ],
  };

  name!: string;
  includedScreenshots!: number;
  githubPlanId!: number | null;
  /**
   * The Marketplace listing's monthly price, copied here by the
   * `github-marketplace-prices` cron — GitHub exposes no seller invoices, so
   * the price times the active subscriptions is what the marketplace book is
   * worth. Null on plans that are not marketplace listings.
   */
  githubMonthlyPriceCents!: number | null;
  stripeProductId!: string | null;
  usageBased!: boolean;
  githubSsoIncluded!: boolean;
  fineGrainedAccessControlIncluded!: boolean;
  samlIncluded!: boolean;
  customDomainsIncluded!: boolean;
  staticIpIncluded!: boolean;
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

  /** The self-serve Pro plan, its legacy 15K version included. */
  static checkIsProPlan(plan: Plan) {
    return plan.name === PRO_PLAN_NAME;
  }

  /** A plan sold through sales, billed monthly or yearly. */
  static checkIsEnterprisePlan(plan: Plan) {
    return ENTERPRISE_PLAN_NAMES.has(plan.name);
  }

  /**
   * The plan staff grant a team evaluating Enterprise. Granted, so it has no
   * subscription: the account points at it with `forcedPlanId`.
   */
  static checkIsEnterpriseTrialPlan(plan: Plan) {
    return plan.name === ENTERPRISE_TRIAL_PLAN_NAME;
  }
}
