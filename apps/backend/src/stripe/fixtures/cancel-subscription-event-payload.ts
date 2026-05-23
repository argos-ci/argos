import Stripe from "stripe";

export const STRIPE_PRODUCT_ID = "prod_cancel_subscription_test";

const subscriptionItem = {
  id: "si_cancel_subscription_test",
  object: "subscription_item",
  current_period_start: 1748458766,
  price: {
    id: "price_cancel_subscription_test",
    object: "price",
    billing_scheme: "per_unit",
    currency: "usd",
    metadata: {},
    product: STRIPE_PRODUCT_ID,
    tiers_mode: null,
  },
};

const subscription = {
  id: "sub_1RTpCFHOD9RpIFZd45QUqg5c",
  object: "subscription",
  status: "canceled",
  customer: "cus_PRPaBZyCzhbTxA",
  default_payment_method: "pm_cancel_subscription_test",
  currency: "usd",
  created: 1748458766,
  cancel_at: null,
  ended_at: 1748458766,
  trial_end: null,
  items: {
    object: "list",
    data: [subscriptionItem],
    has_more: false,
    url: "",
  },
  cancellation_details: {
    comment: "The price jump was too sporadic.",
    feedback: "too_expensive",
    reason: "cancellation_requested",
  },
} as unknown as Stripe.Subscription;

const cancellationFeedbackUpdatedSubscription = {
  ...subscription,
  status: "active",
  cancel_at: 1751050766,
  ended_at: null,
  cancellation_details: {
    comment: null,
    feedback: "too_expensive",
    reason: "cancellation_requested",
  },
} as unknown as Stripe.Subscription;

export const CANCEL_SUBSCRIPTION_EVENT_PAYLOAD = {
  id: "evt_test",
  object: "event",
  type: "customer.subscription.deleted",
  data: {
    object: subscription,
  },
};

const cancellationFeedbackUpdatedEventData = {
  object: cancellationFeedbackUpdatedSubscription,
  previous_attributes: {
    cancellation_details: {
      feedback: null,
    },
  },
} as unknown as Stripe.CustomerSubscriptionUpdatedEvent.Data;

export const CANCELLATION_FEEDBACK_UPDATED_SUBSCRIPTION_EVENT_PAYLOAD = {
  id: "evt_test_cancellation_feedback_updated",
  object: "event",
  type: "customer.subscription.updated",
  data: cancellationFeedbackUpdatedEventData,
};
