import Stripe from "stripe";

export const TRIAL_STRIPE_PRODUCT_ID = "prod_trial_test";
export const TRIAL_STRIPE_SUBSCRIPTION_ID = "sub_trial_test";
export const TRIAL_INCLUDED_SCREENSHOTS = 15000;
/** Moment the trial started. */
const TRIAL_START_TIMESTAMP = 1751760000;
/**
 * Moment the trial is ended early: the new billing period starts there, so
 * the synced `startDate` must land on this timestamp.
 */
export const TRIAL_CONVERSION_TIMESTAMP = 1752969600;

function createPlanItem(currentPeriodStart: number) {
  return {
    id: "si_trial_test",
    object: "subscription_item",
    current_period_start: currentPeriodStart,
    price: {
      id: "price_trial_test",
      object: "price",
      billing_scheme: "per_unit",
      currency: "usd",
      metadata: { includedScreenshots: String(TRIAL_INCLUDED_SCREENSHOTS) },
      product: TRIAL_STRIPE_PRODUCT_ID,
      tiers_mode: null,
    },
  };
}

/**
 * A Stripe subscription while its trial is running, as returned by a
 * `subscriptions.retrieve` before the conversion.
 */
export const TRIALING_STRIPE_SUBSCRIPTION = {
  id: TRIAL_STRIPE_SUBSCRIPTION_ID,
  object: "subscription",
  status: "trialing",
  customer: "cus_trial_test",
  // Set so the payment method check does not have to reach the Stripe API.
  default_payment_method: "pm_trial_test",
  currency: "usd",
  created: TRIAL_START_TIMESTAMP,
  cancel_at: null,
  ended_at: null,
  trial_end: TRIAL_CONVERSION_TIMESTAMP,
  billing_cycle_anchor: TRIAL_START_TIMESTAMP,
  items: {
    object: "list",
    data: [createPlanItem(TRIAL_START_TIMESTAMP)],
    has_more: false,
    url: "",
  },
} as unknown as Stripe.Subscription;

/**
 * The same subscription right after its trial has been ended: `status` is
 * active and a new billing period opens at the conversion moment.
 */
export const ENDED_TRIAL_STRIPE_SUBSCRIPTION = {
  ...(TRIALING_STRIPE_SUBSCRIPTION as unknown as Record<string, unknown>),
  status: "active",
  billing_cycle_anchor: TRIAL_CONVERSION_TIMESTAMP,
  items: {
    object: "list",
    data: [createPlanItem(TRIAL_CONVERSION_TIMESTAMP)],
    has_more: false,
    url: "",
  },
} as unknown as Stripe.Subscription;
