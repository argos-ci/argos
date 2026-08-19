import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account } from "./Account";
import { Plan } from "./Plan";

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
          flatPrice: {
            anyOf: [{ type: "null" }, { type: "number", minimum: 0 }],
          },
          additionalScreenshotPrice: {
            anyOf: [{ type: "null" }, { type: "number", minimum: 0 }],
          },
          additionalStorybookScreenshotPrice: {
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
  /**
   * Recurring amount of the plan itself, per billing period and in `currency`.
   *
   * Null when the subscription has not been synced since the column existed, or
   * when there is no Stripe price to read it from — a GitHub subscription, or a
   * plan priced by tiers, which has no single unit amount.
   */
  flatPrice!: number | null;
  additionalScreenshotPrice!: number | null;
  additionalStorybookScreenshotPrice!: number | null;
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
    const [lastResetDate] = this.getPeriodStarts(now, interval, 1);
    invariant(lastResetDate, "a period always has a start");
    return lastResetDate;
  }

  /**
   * Start of the billing period holding `now`, then the start of each period
   * before it, most recent first.
   *
   * The anniversary is read as the offset `startDate` sits at inside its own
   * interval, and that offset is applied to each interval walked back — rather
   * than counting periods down from `startDate`, which is the *current* period
   * start and moves forward at every renewal.
   */
  getPeriodStarts(
    now: Date,
    interval: SubscriptionInterval,
    count: number,
  ): Date[] {
    const currentIndex = this.getCurrentPeriodIndex(now, interval);

    return Array.from({ length: count }, (_, index) =>
      this.getResetDateAt(now, interval, currentIndex + index),
    );
  }

  /**
   * End of the billing period holding `now` — the moment the next one opens,
   * and the day the included quota resets on.
   *
   * The counterpart of `getPeriodStarts`, for the one period whose end cannot
   * be read off the period after it: the running one has none yet.
   */
  getPeriodEnd(now: Date, interval: SubscriptionInterval): Date {
    // One interval past the current period's own start, walked with the same
    // anniversary rule — so a period that opened on the 31st still ends where
    // the next one opens in a 30-day month.
    return this.getResetDateAt(
      now,
      interval,
      this.getCurrentPeriodIndex(now, interval) - 1,
    );
  }

  /**
   * The anniversary `index` whole intervals back from the one holding `now`.
   * A negative index walks forward instead, which is what reads the next one.
   */
  getResetDateAt(now: Date, interval: SubscriptionInterval, index: number) {
    const startDate = new Date(this.startDate);
    const anniversaryOffset =
      startDate.getTime() - getStartOf(startDate, interval).getTime();
    const intervalStart = shiftIntervals(
      getStartOf(now, interval),
      interval,
      -index,
    );
    const nextIntervalStart = shiftIntervals(intervalStart, interval, 1);
    // A subscription that started on the 31st has no anniversary in a
    // 30-day month: it resets when the next interval opens.
    return new Date(
      Math.min(
        intervalStart.getTime() + anniversaryOffset,
        nextIntervalStart.getTime(),
      ),
    );
  }

  /**
   * Which anniversary the period holding `now` opened on: this interval's own
   * once it has passed, and the previous one until then.
   */
  getCurrentPeriodIndex(now: Date, interval: SubscriptionInterval): number {
    return this.getResetDateAt(now, interval, 0).getTime() < now.getTime()
      ? 0
      : 1;
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

/** Moves a date sitting on an interval boundary by `count` whole intervals. */
function shiftIntervals(
  date: Date,
  interval: SubscriptionInterval,
  count: number,
) {
  switch (interval) {
    case "month":
      return new Date(date.getFullYear(), date.getMonth() + count, 1);
    case "year":
      return new Date(date.getFullYear() + count, 0, 1);
    default:
      assertNever(interval);
  }
}
