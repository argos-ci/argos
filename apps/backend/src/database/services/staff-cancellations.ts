import type { QueryBuilder } from "objection";

import { classifyInvoice, getInvoiceRevenue, toEuros } from "@/stripe/revenue";

import { Plan, StripeInvoice, Subscription } from "../models";

/** What `Account#getActiveSubscription` counts as running. */
const RUNNING_STATUSES = ["active", "trialing", "past_due"];

/**
 * The invoices that state what a subscription costs per cycle.
 *
 * A proration from a plan change or a threshold bill is a fraction of a cycle,
 * and reading the last one of those would understate what the team paid.
 */
const CYCLE_BILLING_REASONS = ["subscription_create", "subscription_cycle"];

const MONTH_MS = (365.25 / 12) * 24 * 3600 * 1000;

/**
 * Matches when the team of the subscription named `subscriptions` holds a paid
 * subscription that runs on with no end in sight: the same one with its
 * cancellation called off, or a new one.
 */
function whereTeamRenews(builder: QueryBuilder<Subscription>) {
  return builder.whereExists(
    Subscription.query()
      .alias("renewing")
      .join("plans as renewing_plan", "renewing_plan.id", "renewing.planId")
      .whereColumn("renewing.accountId", "subscriptions.accountId")
      .whereNot("renewing_plan.name", "free")
      .whereIn("renewing.status", RUNNING_STATUSES)
      .whereNull("renewing.endDate")
      .whereRaw(`renewing."startDate" < now()`),
  );
}

/**
 * The cancellations the staff page lists over the last `days` days: the latest
 * paid subscription of each team that ended or is scheduled to, asked for
 * within the window, as long as nothing else keeps the team a customer.
 */
export async function getStaffCancellations(
  days: number,
): Promise<Subscription[]> {
  return (
    Subscription.query()
      .select("subscriptions.*")
      .join("plans", "plans.id", "subscriptions.planId")
      .join("accounts", "accounts.id", "subscriptions.accountId")
      .whereNotNull("accounts.teamId")
      // A granted plan keeps the team a customer whatever its subscriptions say.
      .whereNull("accounts.forcedPlanId")
      .whereNot("plans.name", "free")
      .whereIn("subscriptions.status", ["canceled", ...RUNNING_STATUSES])
      .whereNotNull("subscriptions.endDate")
      .whereRaw(
        `coalesce(subscriptions."canceledAt", subscriptions."endDate") >= now() - make_interval(days => ?)`,
        [days],
      )
      // A trial that ran out with no card on file was never a commitment, and
      // nobody asked for it to stop: it belongs to the trial pipeline. Stripe
      // ends it at the trial end, which is also where a trial canceled "at the
      // end of the period" ends. A survey answer is what tells the two apart.
      .whereNot((builder) =>
        builder
          .where("subscriptions.paymentMethodFilled", false)
          .whereNull("subscriptions.cancellationFeedback")
          .whereNotNull("subscriptions.trialEndDate")
          .whereRaw(`subscriptions."endDate" >= subscriptions."trialEndDate"`),
      )
      .whereNot(whereTeamRenews)
      .distinctOn("subscriptions.accountId")
      .orderBy("subscriptions.accountId")
      .orderByRaw(
        `coalesce(subscriptions."canceledAt", subscriptions."endDate") desc`,
      )
  );
}

/** What a subscription brought in, in euros. */
export type SubscriptionRevenue = {
  /**
   * What one month of it was worth, read off its last cycle bill. Null when it
   * never billed a cycle: canceled during its trial.
   */
  monthly: number | null;
  /** Everything it was paid. Null when the provider shares no invoices. */
  lifetime: number | null;
};

/**
 * What each of these subscriptions brought in, in the order given.
 *
 * Stripe subscriptions are read off the invoice mirror: what was actually paid,
 * negotiated prices and credit notes included. GitHub bills on its own side
 * and shares no invoices, so a Marketplace subscription is worth its plan's
 * list price, and its lifetime is unknown.
 */
export async function getSubscriptionRevenues(
  subscriptions: Subscription[],
): Promise<SubscriptionRevenue[]> {
  const stripeSubscriptionIds = subscriptions.flatMap((subscription) =>
    subscription.stripeSubscriptionId
      ? [subscription.stripeSubscriptionId]
      : [],
  );
  const githubPlanIds = subscriptions.flatMap((subscription) =>
    subscription.provider === "github" ? [subscription.planId] : [],
  );

  const [invoices, plans] = await Promise.all([
    stripeSubscriptionIds.length > 0
      ? StripeInvoice.query()
          .whereIn("stripeSubscriptionId", stripeSubscriptionIds)
          .where("status", "paid")
          .orderBy("stripeCreatedAt", "desc")
      : [],
    githubPlanIds.length > 0 ? Plan.query().findByIds(githubPlanIds) : [],
  ]);

  const invoicesBySubscriptionId = Map.groupBy(
    invoices,
    (invoice) => invoice.stripeSubscriptionId,
  );
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  return subscriptions.map((subscription) => {
    if (subscription.provider === "github") {
      const priceCents = planById.get(
        subscription.planId,
      )?.githubMonthlyPriceCents;
      const neverBilled =
        subscription.trialEndDate !== null &&
        subscription.endDate !== null &&
        new Date(subscription.endDate) <= new Date(subscription.trialEndDate);
      return {
        monthly:
          priceCents && !neverBilled
            ? toEuros({ amount: priceCents / 100, currency: "usd" })
            : null,
        lifetime: null,
      };
    }

    const subscriptionInvoices =
      invoicesBySubscriptionId.get(subscription.stripeSubscriptionId) ?? [];
    const lifetime = subscriptionInvoices.reduce(
      (total, invoice) => total + toEuros(getInvoiceRevenue(invoice)),
      0,
    );
    const lastCycle = subscriptionInvoices.find(
      (invoice) =>
        invoice.billingReason !== null &&
        CYCLE_BILLING_REASONS.includes(invoice.billingReason) &&
        getInvoiceRevenue(invoice).amount > 0,
    );

    return {
      monthly: lastCycle ? getMonthlyAmount(lastCycle) : null,
      lifetime,
    };
  });
}

/**
 * One cycle bill brought to a month: a year's bill counts a twelfth.
 *
 * Divided by the whole months it covers rather than by its length in days: a
 * year is 365 days, not twelve average months, and the 12,000 contract has to
 * read as 1,000 a month, not 1,001.
 */
function getMonthlyAmount(invoice: StripeInvoice): number {
  const amount = toEuros(getInvoiceRevenue(invoice));
  const kind = classifyInvoice(invoice, { customerHasTerm: false });
  if (kind.kind === "contract") {
    const months = Math.round(
      (kind.coverage.end - kind.coverage.start) / MONTH_MS,
    );
    return amount / Math.max(1, months);
  }
  return amount;
}
