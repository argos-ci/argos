import { getBilledAddOns, type AddOn } from "@argos/util/add-ons";

import type { Plan, Subscription, Team } from "../models";

/**
 * Whether add-ons can be billed onto this subscription.
 *
 * They ride as extra products on a Stripe subscription, so a forced plan (which
 * has no subscription at all) and a GitHub Marketplace one have nothing to
 * carry them, however healthy their plan is otherwise.
 *
 * Narrows `stripeSubscriptionId` so callers can bill without asserting.
 */
export function checkCanBillAddOns(
  subscription: Subscription | null,
): subscription is Subscription & { stripeSubscriptionId: string } {
  return (
    subscription !== null &&
    subscription.provider === "stripe" &&
    subscription.stripeSubscriptionId !== null
  );
}

/**
 * Whether the plan is billed yearly.
 *
 * Add-on products are priced monthly and Stripe refuses items whose interval
 * differs from the rest of the subscription, so a yearly plan cannot take one.
 */
export function checkIsYearlyPlan(plan: Plan | null): boolean {
  return plan?.interval === "year";
}

/**
 * The add-ons billed on a subscription, read off what its team enabled with the
 * rule the dialog that sells them uses, on a subscription that can carry them.
 */
export function getSubscriptionAddOns(
  team: Team | undefined,
  subscription: Subscription,
): AddOn[] {
  const plan = subscription.plan ?? null;
  if (!team || !checkCanBillAddOns(subscription) || checkIsYearlyPlan(plan)) {
    return [];
  }
  return getBilledAddOns({
    enabled: {
      "github-sso": team.ssoGithubAccountId !== null,
      "saml-sso": team.samlPurchased,
      "static-ip": team.staticIpEnabled,
    },
    plan,
  });
}
