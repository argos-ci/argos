import { checkIsActiveSubscriptionStatus } from "@argos/schemas/subscription-status";

import {
  AccountSubscriptionProvider,
  AccountSubscriptionStatus,
  PlanInterval,
} from "@/gql/graphql";

/**
 * Why a paid add-on cannot be turned on, or null when it can.
 *
 * The order of these checks is the point. A plan that already carries the
 * feature answers before anything about billing is asked — otherwise accounts
 * that legitimately have it, but no Stripe subscription to bill an add-on to,
 * would be refused the feature they already own.
 *
 * Lives here rather than in `@argos/schemas` because it produces user-facing
 * copy: the backend enforces the same rule, it does not phrase it.
 */
export function getAddOnBlockedReason(args: {
  status: AccountSubscriptionStatus | null | undefined;
  provider: AccountSubscriptionProvider | null | undefined;
  interval: PlanInterval | null | undefined;
  includedInPlan: boolean;
  usageBased: boolean;
  featureName: string;
}): string | null {
  const {
    status,
    provider,
    interval,
    includedInPlan,
    usageBased,
    featureName,
  } = args;

  if (!checkIsActiveSubscriptionStatus(status)) {
    return `You must have an active subscription to enable ${featureName}.`;
  }

  if (includedInPlan) {
    return null;
  }

  // Add-ons are billed as extra products on top of a Stripe subscription. A
  // forced plan has none, and a GitHub Marketplace subscription cannot carry
  // them — both are healthy plans that simply have nothing to bill against.
  if (provider !== AccountSubscriptionProvider.Stripe) {
    return `Your plan does not allow enabling ${featureName}, please contact us.`;
  }

  // Add-on products are priced monthly, and Stripe refuses items whose interval
  // differs from the rest of the subscription.
  if (interval === PlanInterval.Year) {
    return `${featureName} cannot be added to a yearly plan, please contact us.`;
  }

  if (!usageBased) {
    return "This feature is not available on your current plan, please contact us.";
  }

  return null;
}
