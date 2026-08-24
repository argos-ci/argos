import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";

/**
 * One completed reconciliation sweep of the Stripe invoice mirror.
 *
 * The reader's coverage proof: the revenue page refuses a window older than
 * the deepest `sinceDate` ever swept, so a mirror that was never backfilled
 * reports an operator-actionable error instead of zeros that read as figures.
 */
export class StripeInvoiceSync extends Model {
  static override tableName = "stripe_invoice_syncs";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["sinceDate", "completedAt"],
        properties: {
          sinceDate: { type: "string" },
          completedAt: { type: "string" },
        },
      },
    ],
  };

  /** The start of the window the sweep read. */
  sinceDate!: string;
  /** When it finished reading it. */
  completedAt!: string;
}
