/**
 * The statuses that unlock team features, and the add-ons that go on top of
 * them.
 *
 * A trial qualifies from the moment a card is on file — that is what makes it
 * convert automatically when it ends — which is why this reads two statuses and not one.
 *
 * Shared because both sides answer the same question and must agree: the
 * frontend to decide whether to offer a button, the backend to decide whether
 * to honor it. A list that drifted would offer a button the API refuses.
 */
export const ACTIVE_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing_with_payment_method",
] as const;

export function checkIsActiveSubscriptionStatus(
  status: string | null | undefined,
): boolean {
  return (
    status != null &&
    (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)
  );
}

/**
 * The statuses that mean the account already holds a subscription, whether or
 * not it currently unlocks team features.
 *
 * Wider than `ACTIVE_SUBSCRIPTION_STATUSES` on purpose, and it answers a
 * different question: not "may this team use team features?" but "would
 * subscribing again collide with an existing subscription?". A card-less trial
 * or a past-due subscription unlocks nothing, yet Stripe checkout refuses to
 * create a second subscription over it.
 *
 * This must mirror the statuses `Account#getActiveSubscription` selects on:
 * anything it can return is a subscription checkout would collide with.
 */
export const SUBSCRIBED_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "trialing_with_payment_method",
  "past_due",
] as const;

export function checkHasSubscriptionStatus(
  status: string | null | undefined,
): boolean {
  return (
    status != null &&
    (SUBSCRIBED_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)
  );
}

/**
 * The statuses of a running trial, with or without a payment method.
 */
export const TRIALING_SUBSCRIPTION_STATUSES = [
  "trialing",
  "trialing_with_payment_method",
] as const;

export function checkIsTrialingSubscriptionStatus(
  status: string | null | undefined,
): boolean {
  return (
    status != null &&
    (TRIALING_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)
  );
}
