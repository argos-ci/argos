import Stripe from "stripe";

const subscription: Stripe.Subscription = {
  id: "sub_1RTpCFHOD9RpIFZd45QUqg5c",
  object: "subscription",
  status: "canceled",
  customer: "cus_PRPaBZyCzhbTxA",
  currency: "usd",
  created: 1748458766,
  items: {
    object: "list",
    data: [],
    has_more: false,
    url: "",
  },
  cancellation_details: {
    comment: "The price jump was too sporadic.",
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
