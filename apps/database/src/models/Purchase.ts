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
      source: {
        type: ["string"],
        enum: ["github", "stripe"],
      },
      endDate: { type: ["string", "null"] },
      startDate: { type: ["string"] },
    },
  });

  accountId!: string;
  planId!: string;
  purchaserId!: string | null;
  source!: string;
  endDate!: string | null;
  startDate!: string;

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
            startOfMonth.getTime() // end of previous month
          )
        );
  }

  static encodeStripeClientReferenceId({
    accountId,
    purchaserId,
  }: {
    accountId: string;
    purchaserId: string | null;
  }) {
    return Buffer.from(JSON.stringify({ accountId, purchaserId }), "utf8")
      .toString("base64")
      .replaceAll(/=/g, "_");
  }

  static decodeStripeClientReferenceId(clientReferenceId: string) {
    const payload = Buffer.from(
      clientReferenceId.replaceAll(/_/g, "="),
      "base64"
    ).toString("utf-8");
    return JSON.parse(payload);
  }
}
