import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { Plan } from "./Plan.js";

const getStartOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const getStartOfPreviousMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() - 1, 1);

export class Purchase extends Model {
  static override tableName = "purchases";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["accountId", "planId"],
    properties: {
      accountId: { type: ["string"] },
      planId: { type: ["string"] },
      purchaserId: { type: ["string", "null"] },
      stripeSubscriptionId: { type: ["string", "null"] },
      source: {
        type: ["string"],
        enum: ["github", "stripe"],
      },
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
      endDate: { type: ["string", "null"] },
      startDate: { type: ["string"] },
      trialEndDate: { type: ["string", "null"] },
      paymentMethodFilled: { type: ["boolean", "null"] },
    },
  });

  accountId!: string;
  planId!: string;
  purchaserId!: string | null;
  stripeSubscriptionId!: string | null;
  source!: "github" | "stripe";
  endDate!: string | null;
  startDate!: string;
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

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "purchases.accountId",
          to: "accounts.id",
        },
      },
      plan: {
        relation: Model.BelongsToOneRelation,
        modelClass: Plan,
        join: {
          from: "purchases.planId",
          to: "plans.id",
        },
      },
    };
  }

  account?: Account;
  plan?: Plan;

  getLastResetDate(now = new Date()) {
    const startOfMonth = getStartOfMonth(now);
    const purchaseDate = new Date(this.startDate);
    const timeInMonth = now.getTime() - startOfMonth.getTime();
    const purchaseTimeInMonth =
      purchaseDate.getTime() - getStartOfMonth(purchaseDate).getTime();
    const billingHasResetThisMonth = timeInMonth > purchaseTimeInMonth;

    return billingHasResetThisMonth
      ? new Date(startOfMonth.getTime() + purchaseTimeInMonth)
      : new Date(
          Math.min(
            getStartOfPreviousMonth(now).getTime() + purchaseTimeInMonth,
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
