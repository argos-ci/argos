import type Stripe from "stripe";

import type { Subscription } from "@/database/models";

import { checkIsStripeConfigured, stripe } from "./index";

/**
 * Whether Stripe takes a discount off the subscription's bills: a coupon on
 * the subscription, on one of its items or on its customer. Argos mirrors none
 * of them, so this asks Stripe.
 *
 * False for a subscription Stripe does not bill, and wherever Stripe is not
 * configured: development and test run against a placeholder key.
 */
export async function checkHasStripeDiscount(
  subscription: Subscription,
): Promise<boolean> {
  if (
    !checkIsStripeConfigured() ||
    subscription.provider !== "stripe" ||
    !subscription.stripeSubscriptionId
  ) {
    return false;
  }

  const stripeSubscription = await retrieveSubscription(
    subscription.stripeSubscriptionId,
  );
  if (!stripeSubscription) {
    return false;
  }
  const { customer } = stripeSubscription;

  return (
    stripeSubscription.discounts.length > 0 ||
    stripeSubscription.items.data.some((item) => item.discounts.length > 0) ||
    (typeof customer !== "string" &&
      !customer.deleted &&
      Boolean(customer.discount))
  );
}

/**
 * The subscription with its customer, or null when Stripe has no such
 * subscription: the seeded ones of development and test, read against a real
 * test key, carry no discount either.
 */
async function retrieveSubscription(
  stripeSubscriptionId: string,
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["customer"],
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "resource_missing"
    ) {
      return null;
    }
    throw error;
  }
}
