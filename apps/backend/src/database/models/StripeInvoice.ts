import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";

/**
 * Mirror of a Stripe invoice — the fields the revenue page reads.
 *
 * Kept in sync by the Stripe webhooks plus a reconciliation sweep
 * (`stripe/bin/sync-stripe-invoices.ts`); the invoice itself stays in Stripe.
 * Amounts are in the currency's minor unit, as Stripe states them.
 */
export class StripeInvoice extends Model {
  static override tableName = "stripe_invoices";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: [
          "stripeInvoiceId",
          "stripeCustomerId",
          "stripeCreatedAt",
          "status",
          "currency",
          "total",
          "creditedAmountExcludingTax",
        ],
        properties: {
          stripeInvoiceId: { type: "string" },
          stripeCustomerId: { type: "string" },
          stripeSubscriptionId: { type: ["string", "null"] },
          stripeCreatedAt: { type: "string" },
          status: { type: "string" },
          billingReason: { type: ["string", "null"] },
          currency: { type: "string" },
          total: { type: "number" },
          totalExcludingTax: { type: ["number", "null"] },
          totalTaxesAmount: { type: ["number", "null"] },
          creditedAmountExcludingTax: { type: "number" },
          periodStart: { type: ["string", "null"] },
          periodEnd: { type: ["string", "null"] },
        },
      },
    ],
  };

  stripeInvoiceId!: string;
  stripeCustomerId!: string;
  stripeSubscriptionId!: string | null;
  /** Stripe's own `created`, which is what files an invoice into a month. */
  stripeCreatedAt!: string;
  status!: string;
  billingReason!: string | null;
  currency!: string;
  total!: number;
  totalExcludingTax!: number | null;
  /** The listed taxes added up — the fallback when no pre-tax total is stated. */
  totalTaxesAmount!: number | null;
  /**
   * The credit notes' ex-tax totals added up — ex-tax like the base they are
   * taken off, where the invoice's own rollup fields are tax-inclusive.
   */
  creditedAmountExcludingTax!: number;
  /**
   * The longest stretch one of the invoice's lines covers, resolved at
   * ingest — what tells an annual bill from a true-up.
   */
  periodStart!: string | null;
  periodEnd!: string | null;
}
