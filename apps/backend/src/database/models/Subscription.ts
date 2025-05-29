import { assertNever } from "@argos/util/assertNever";
import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { Plan } from "./Plan.js";

export type SubscriptionInterval = "month" | "year";

export class Subscription extends Model {
  static override tableName = "subscriptions";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
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
          paymentMethodFilled: { type: "boolean" },
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
          includedScreenshots: {
            anyOf: [{ type: "null" }, { type: "integer", minimum: 0 }],
          },
          additionalScreenshotPrice: {
            anyOf: [{ type: "null" }, { type: "number", minimum: 0 }],
          },
          usageUpdatedAt: { type: ["string", "null"] },
          currency: {
            anyOf: [{ type: "null" }, { type: "string", enum: ["usd", "eur"] }],
          },
        },
      },
    ],
  };

  planId!: string;
  provider!: "github" | "stripe";
  stripeSubscriptionId!: string | null;
  accountId!: string;
  subscriberId!: string | null;
  startDate!: string;
  endDate!: string | null;
  trialEndDate!: string | null;
  paymentMethodFilled!: boolean;
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
  additionalScreenshotPrice!: number | null;
  usageUpdatedAt!: string | null;
  currency!: "usd" | "eur" | null;

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

  getLastResetDate(now: Date, interval: SubscriptionInterval) {
    const startOfPeriod = getStartOf(now, interval);
    const startDate = new Date(this.startDate);
    const periodDuration = now.getTime() - startOfPeriod.getTime();
    const subscriptionPeriodDuration =
      startDate.getTime() - getStartOf(startDate, interval).getTime();
    const billingHasResetThisPeriod =
      periodDuration > subscriptionPeriodDuration;

    return billingHasResetThisPeriod
      ? new Date(startOfPeriod.getTime() + subscriptionPeriodDuration)
      : new Date(
          Math.min(
            getStartOfPrevious(now, interval).getTime() +
              subscriptionPeriodDuration,
            startOfPeriod.getTime(), // end of previous period
          ),
        );
  }
}

function getStartOf(date: Date, interval: SubscriptionInterval) {
  switch (interval) {
    case "month":
      return new Date(date.getFullYear(), date.getMonth(), 1);
    case "year":
      return new Date(date.getFullYear(), 0, 1);
    default:
      assertNever(interval);
  }
}

function getStartOfPrevious(date: Date, interval: SubscriptionInterval) {
  switch (interval) {
    case "month":
      return new Date(date.getFullYear(), date.getMonth() - 1, 1);
    case "year":
      return new Date(date.getFullYear() - 1, 0, 1);
    default:
      assertNever(interval);
  }
}
