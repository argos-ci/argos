import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { Plan } from "./Plan.js";

const getStartOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const getStartOfPreviousMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() - 1, 1);

export class Subscription extends Model {
  static override tableName = "subscriptions";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["accountId", "planId", "provider", "startDate", "status"],
    properties: {
      planId: { type: ["string"] },
      provider: {
        type: ["string"],
        enum: ["github", "stripe"],
      },
      stripeSubscriptionId: { type: ["string", "null"] },
      accountId: { type: ["string"] },
      subscriberId: { type: ["string", "null"] },
      startDate: { type: ["string"] },
      endDate: { type: ["string", "null"] },
      trialEndDate: { type: ["string", "null"] },
      paymentMethodFilled: { type: ["boolean", "null"] },
      status: {
        type: ["string"],
        enum: [
          "active",
          "canceled",
          "trialing",
          "past_due",
          "incomplete",
          "unpaid",
          "incomplete_expired",
          "paused",
        ],
      },
      includedScreenshots: { type: ["number", "null"] },
    },
  });

  planId!: string;
  provider!: "github" | "stripe";
  stripeSubscriptionId!: string | null;
  accountId!: string;
  subscriberId!: string | null;
  startDate!: string;
  endDate!: string | null;
  trialEndDate!: string | null;
  paymentMethodFilled!: boolean | null;
  status!:
    | "active"
    | "canceled"
    | "trialing"
    | "past_due"
    | "incomplete"
    | "unpaid"
    | "incomplete_expired"
    | "paused";
  includedScreenshots!: number | null;

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "subscriptions.accountId",
          to: "accounts.id",
        },
      },
      plan: {
        relation: Model.BelongsToOneRelation,
        modelClass: Plan,
        join: {
          from: "subscriptions.planId",
          to: "plans.id",
        },
      },
    };
  }

  account?: Account;
  plan?: Plan;

  getLastResetDate(now = new Date()) {
    const startOfMonth = getStartOfMonth(now);
    const startDate = new Date(this.startDate);
    const monthDuration = now.getTime() - startOfMonth.getTime();
    const monthSubscriptionDuration =
      startDate.getTime() - getStartOfMonth(startDate).getTime();
    const billingHasResetThisMonth = monthDuration > monthSubscriptionDuration;

    return billingHasResetThisMonth
      ? new Date(startOfMonth.getTime() + monthSubscriptionDuration)
      : new Date(
          Math.min(
            getStartOfPreviousMonth(now).getTime() + monthSubscriptionDuration,
            startOfMonth.getTime(), // end of previous month
          ),
        );
  }

  $isTrialActive() {
    return Boolean(
      this.trialEndDate && new Date() < new Date(this.trialEndDate),
    );
  }
}
