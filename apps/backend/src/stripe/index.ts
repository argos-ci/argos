import Stripe from "stripe";
import { z } from "zod";

import config from "@/config/index.js";
import type { Objection } from "@/database/index.js";
import { Account, Plan, Purchase } from "@/database/models/index.js";

export type { Stripe };

const getPlanFromStripeProductId = async (stripeProductId: string) => {
  return Plan.query()
    .findOne({ stripePlanId: stripeProductId })
    .throwIfNotFound({
      message: `can't find plan with stripeProductId: "${stripeProductId}"`,
    });
};

const StripeClientReferenceIdPayloadSchema = z.object({
  accountId: z.string(),
  purchaserId: z.string(),
});

type StripeClientReferenceIdPayload = z.infer<
  typeof StripeClientReferenceIdPayloadSchema
>;

export const encodeStripeClientReferenceId = (
  payload: StripeClientReferenceIdPayload,
) => {
  return Buffer.from(JSON.stringify(payload), "utf8")
    .toString("base64")
    .replaceAll(/=/g, "_");
};

const decodeStripeClientReferenceId = (clientReferenceId: string) => {
  const json = Buffer.from(
    clientReferenceId.replaceAll(/_/g, "="),
    "base64",
  ).toString("utf-8");
  return StripeClientReferenceIdPayloadSchema.parse(JSON.parse(json));
};

const getClientReferenceIdFromSession = (session: Stripe.Checkout.Session) => {
  const clientReferenceId = session.client_reference_id;
  if (!clientReferenceId) {
    throw new Error(
      `empty clientReferenceId in stripe session "${session.id}"`,
    );
  }
  return decodeStripeClientReferenceId(clientReferenceId);
};

const getCustomerIdFromSession = (session: Stripe.Checkout.Session) => {
  if (!session.customer) {
    throw new Error(`empty customer in stripe session "${session.id}"`);
  }

  if (typeof session.customer === "string") {
    return session.customer;
  }

  return session.customer.id;
};

const getSubscriptionFromSession = async (
  session: Stripe.Checkout.Session,
  stripe: Stripe,
): Promise<Stripe.Subscription> => {
  if (!session.subscription) {
    throw new Error(`empty subscription in stripe session "${session.id}"`);
  }

  if (typeof session.subscription === "string") {
    return stripe.subscriptions.retrieve(session.subscription);
  }

  return session.subscription;
};

const getFirstItemFromSubscription = (subscription: Stripe.Subscription) => {
  const first = subscription.items.data[0];
  if (!first) {
    throw new Error("no item found in Stripe subscription");
  }
  return first;
};

const getFirstProductIdFromSubscription = (
  subscription: Stripe.Subscription,
) => {
  const first = getFirstItemFromSubscription(subscription);
  const { product } = first.price;
  if (typeof product === "string") {
    return product;
  }
  return product.id;
};

const timestampToISOString = (date: number) =>
  new Date(date * 1000).toISOString();

export const stripe = new Stripe(config.get("stripe.apiKey"), {
  apiVersion: "2023-10-16",
  typescript: true,
});

const createPurchaseFromCheckoutSession = async ({
  account,
  purchaserId,
  session,
  stripe,
}: {
  account: Account;
  purchaserId: string;
  session: Stripe.Checkout.Session;
  stripe: Stripe;
}) => {
  const subscription = await getSubscriptionFromSession(session, stripe);
  return createPurchaseFromSubscription({
    account,
    purchaserId,
    subscription,
  });
};

const getCustomerFromSubscription = async (
  subscription: Stripe.Subscription,
) => {
  if (typeof subscription.customer === "string") {
    return stripe.customers.retrieve(subscription.customer);
  }
  return subscription.customer;
};

const checkSubscriptionPaymentMethodFilled = async (
  subscription: Stripe.Subscription,
) => {
  if (subscription.default_payment_method !== null) {
    return true;
  }
  const customer = await getCustomerFromSubscription(subscription);
  if (customer.deleted) return false;
  return customer.invoice_settings.default_payment_method !== null;
};

const getPurchaseDataFromSubscription = async (
  subscription: Stripe.Subscription,
): Promise<Objection.PartialModelObject<Purchase>> => {
  const stripeProductId = getFirstProductIdFromSubscription(subscription);
  const [plan, paymentMethodFilled] = await Promise.all([
    getPlanFromStripeProductId(stripeProductId),
    checkSubscriptionPaymentMethodFilled(subscription),
  ]);
  const startDate = timestampToISOString(subscription.current_period_start);
  const trialEndDate = subscription.trial_end
    ? timestampToISOString(subscription.trial_end)
    : null;
  const rawEndDate = subscription.ended_at || subscription.cancel_at;
  const endDate = rawEndDate ? timestampToISOString(rawEndDate) : null;

  return {
    planId: plan.id,
    source: "stripe",
    stripeSubscriptionId: subscription.id,
    startDate,
    endDate,
    trialEndDate,
    paymentMethodFilled,
    status: subscription.status,
  };
};

export const createPurchaseFromSubscription = async ({
  account,
  purchaserId,
  subscription,
}: {
  account: Account;
  purchaserId: string;
  subscription: Stripe.Subscription;
}) => {
  const purchaseData = await getPurchaseDataFromSubscription(subscription);
  return Purchase.query().insertAndFetch({
    ...purchaseData,
    accountId: account.id,
    purchaserId,
  });
};

const getPurchaseFromStripeSubscriptionId = async (
  stripeSubscriptionId: string,
) => {
  const purchase = await Purchase.query().findOne({
    stripeSubscriptionId,
  });

  if (!purchase) {
    throw new Error(
      `Purchase not found for subscription ${stripeSubscriptionId}`,
    );
  }

  return purchase;
};

export const getStripePriceFromPlanOrThrow = async (plan: Plan) => {
  const stripePlanId = plan.stripePlanId;

  if (!stripePlanId) {
    throw new Error(`stripePlanId is empty on plan ${plan.id}`);
  }

  const prices = await stripe.prices.list({
    limit: 2,
    active: true,
    product: plan.stripePlanId,
  });

  if (prices.data.length > 1) {
    throw new Error(
      `stripe return multiple active prices found for plan ${plan.id}`,
    );
  }

  const price = prices.data[0];

  if (!price) {
    throw new Error(`stripe price not found for plan ${plan.id}`);
  }

  return price;
};

export const terminateStripeTrial = async (stripeSubscriptionId: string) => {
  const result = await stripe.subscriptions.update(stripeSubscriptionId, {
    trial_end: "now",
  });

  return result;
};

export const updateStripeUsage = async ({
  account,
  totalScreenshots,
}: {
  account: Account;
  totalScreenshots: number;
}) => {
  const accountSubscription = account.$getSubscription();
  const purchase = await accountSubscription.getActivePurchase();

  // No active purchase, nothing to do
  if (!purchase) {
    return;
  }

  // Only update usage for stripe subscriptions
  if (purchase.source !== "stripe" || !purchase.stripeSubscriptionId) {
    return;
  }

  const plan = await purchase.$relatedQuery("plan");

  // Only update usage for usage-based plans
  if (!plan.usageBased) {
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(
      purchase.stripeSubscriptionId,
    );

    const item = getFirstItemFromSubscription(subscription);

    await stripe.subscriptionItems.createUsageRecord(item.id, {
      action: "set",
      quantity: totalScreenshots,
    });
  } catch (error) {
    throw new Error("error updating stripe usage.", {
      cause: error,
    });
  }
};

export const getStripeProPlanOrThrow = async () => {
  return Plan.query()
    .findOne({ name: "pro", usageBased: true })
    .throwIfNotFound();
};

export const updatePurchaseFromSubscription = async (
  purchase: Purchase,
  subscription: Stripe.Subscription,
) => {
  const purchaseData = await getPurchaseDataFromSubscription(subscription);
  return purchase.$query().patchAndFetch(purchaseData);
};

export const handleStripeEvent = async ({
  data,
  type,
}: Pick<Stripe.Event, "data" | "type">) => {
  switch (type) {
    case "customer.deleted": {
      const customer = data.object as Stripe.Customer;

      await Account.query()
        .where({ stripeCustomerId: customer.id })
        .patch({ stripeCustomerId: null });

      return;
    }
    case "customer.updated": {
      const customer = data.object as Stripe.Customer;
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
      });

      for (const subscription of subscriptions.data) {
        const purchase = await getPurchaseFromStripeSubscriptionId(
          subscription.id,
        );
        await updatePurchaseFromSubscription(purchase, subscription);
      }

      return;
    }

    case "checkout.session.completed": {
      const session = data.object as Stripe.Checkout.Session;

      const { accountId, purchaserId } =
        getClientReferenceIdFromSession(session);

      const stripeCustomerId = getCustomerIdFromSession(session);

      const account = await Account.query()
        .findById(accountId)
        .throwIfNotFound();

      if (account.stripeCustomerId !== stripeCustomerId) {
        await account.$clone().$query().patch({ stripeCustomerId });
      }

      await createPurchaseFromCheckoutSession({
        account,
        purchaserId,
        session,
        stripe,
      });

      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = data.object as Stripe.Subscription;
      const purchase = await getPurchaseFromStripeSubscriptionId(
        subscription.id,
      );
      await updatePurchaseFromSubscription(purchase, subscription);
      return;
    }

    default:
      console.log(`Unhandled event type ${type}`);
  }
};

/**
 * Get Stripe subscription data common to all subscriptions.
 */
export function getSubscriptionData(args: {
  accountId: string;
  purchaserId: string;
  trial: boolean;
}) {
  return {
    ...(args.trial
      ? {
          trial_settings: {
            end_behavior: { missing_payment_method: "cancel" as const },
          },
          trial_period_days: 14,
        }
      : {}),
    metadata: {
      accountId: args.accountId,
      purchaserId: args.purchaserId,
    },
  } satisfies Partial<Stripe.SubscriptionCreateParams>;
}

export const createStripeCheckoutSession = async ({
  plan,
  teamAccount,
  trial,
  purchaserAccount,
  successUrl,
  cancelUrl,
}: {
  plan: Plan;
  teamAccount: Account;
  trial: boolean;
  purchaserAccount: Account;
  successUrl: string;
  cancelUrl: string;
}) => {
  if (!purchaserAccount.userId) {
    throw new Error("Purchaser account must be a user account");
  }

  const accountSubscription = teamAccount.$getSubscription();

  const [activePurchase, price] = await Promise.all([
    accountSubscription.getActivePurchase(),
    getStripePriceFromPlanOrThrow(plan),
  ]);

  if (activePurchase) {
    throw new Error("Account already has an active purchase");
  }

  return stripe.checkout.sessions.create({
    line_items: [{ price: price.id }],
    subscription_data: getSubscriptionData({
      trial,
      accountId: teamAccount.id,
      purchaserId: purchaserAccount.userId,
    }),
    mode: "subscription",
    client_reference_id: encodeStripeClientReferenceId({
      accountId: teamAccount.id,
      purchaserId: purchaserAccount.userId,
    }),
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_collection: trial ? "if_required" : "always",
    ...(teamAccount.stripeCustomerId && {
      customer: teamAccount.stripeCustomerId,
    }),
  });
};

const getCustomerByEmail = async (
  email: string,
): Promise<Stripe.Customer | null> => {
  const customers = await stripe.customers.list({ email });
  const first = customers.data[0];
  if (first) {
    return first;
  }

  return null;
};

const getOrCreateCustomerByEmail = async (
  email: string,
): Promise<Stripe.Customer> => {
  const existingCustomer = await getCustomerByEmail(email);
  if (existingCustomer) {
    return existingCustomer;
  }
  return stripe.customers.create({ email });
};

export const getCustomerIdFromUserAccount = async (
  userAccount: Account,
): Promise<string | null> => {
  if (userAccount.stripeCustomerId) {
    return userAccount.stripeCustomerId;
  }

  const user = await userAccount.$relatedQuery("user").first();

  if (!user) {
    throw new Error("Account is not linked to a user");
  }

  if (!user.email) {
    return null;
  }

  const stripeCustomer = await getOrCreateCustomerByEmail(user.email);
  return stripeCustomer.id;
};
