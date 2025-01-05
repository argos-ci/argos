import { invariant } from "@argos/util/invariant";
import Stripe from "stripe";
import { z } from "zod";

import config from "@/config/index.js";
import { Account, Plan, Subscription } from "@/database/models/index.js";

export type { Stripe };

async function getPlanFromStripeProductId(stripeProductId: string) {
  return Plan.query()
    .findOne({ stripeProductId })
    .throwIfNotFound({
      message: `can't find plan with stripeProductId: "${stripeProductId}"`,
    });
}

const StripeClientReferenceIdPayloadSchema = z.object({
  accountId: z.string(),
  subscriberId: z.string(),
});

type StripeClientReferenceIdPayload = z.infer<
  typeof StripeClientReferenceIdPayloadSchema
>;

export function encodeStripeClientReferenceId(
  payload: StripeClientReferenceIdPayload,
): string {
  return Buffer.from(JSON.stringify(payload), "utf8")
    .toString("base64")
    .replaceAll(/=/g, "_");
}

function decodeStripeClientReferenceId(
  clientReferenceId: string,
): StripeClientReferenceIdPayload {
  const json = Buffer.from(
    clientReferenceId.replaceAll(/_/g, "="),
    "base64",
  ).toString("utf-8");
  return StripeClientReferenceIdPayloadSchema.parse(JSON.parse(json));
}

function getClientReferenceIdFromSession(
  session: Stripe.Checkout.Session,
): StripeClientReferenceIdPayload {
  const clientReferenceId = session.client_reference_id;
  invariant(
    clientReferenceId,
    `empty clientReferenceId in Stripe session "${session.id}"`,
  );
  return decodeStripeClientReferenceId(clientReferenceId);
}

function getCustomerIdFromSession(session: Stripe.Checkout.Session): string {
  invariant(
    session.customer,
    `empty customer in Stripe session "${session.id}"`,
  );

  if (typeof session.customer === "string") {
    return session.customer;
  }

  return session.customer.id;
}

async function getStripeSubscriptionFromSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
): Promise<Stripe.Subscription> {
  invariant(
    session.subscription,
    `empty subscription in Stripe session "${session.id}"`,
  );

  if (typeof session.subscription === "string") {
    return stripe.subscriptions.retrieve(session.subscription);
  }

  return session.subscription;
}

function getFirstItemFromStripeSubscription(
  subscription: Stripe.Subscription,
): Stripe.SubscriptionItem {
  const first = subscription.items.data[0];
  invariant(first, "no item found in Stripe subscription");
  return first;
}

function getFirstProductIdFromSubscription(
  subscription: Stripe.Subscription,
): string {
  const first = getFirstItemFromStripeSubscription(subscription);
  const { product } = first.price;
  if (typeof product === "string") {
    return product;
  }
  return product.id;
}

function timestampToISOString(date: number): string {
  return new Date(date * 1000).toISOString();
}

export const stripe = new Stripe(config.get("stripe.apiKey"), {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

async function createArgosSubscriptionFromCheckoutSession({
  account,
  subscriberId,
  session,
  stripe,
}: {
  account: Account;
  subscriberId: string;
  session: Stripe.Checkout.Session;
  stripe: Stripe;
}): Promise<Subscription> {
  const stripeSubscription = await getStripeSubscriptionFromSession(
    session,
    stripe,
  );
  return createArgosSubscriptionFromStripe({
    account,
    subscriberId,
    stripeSubscription,
  });
}

async function getCustomerFromSubscription(
  subscription: Stripe.Subscription,
): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  if (typeof subscription.customer === "string") {
    return stripe.customers.retrieve(subscription.customer);
  }
  return subscription.customer;
}

async function checkSubscriptionPaymentMethodFilled(
  subscription: Stripe.Subscription,
): Promise<boolean> {
  if (subscription.default_payment_method !== null) {
    return true;
  }
  const customer = await getCustomerFromSubscription(subscription);
  if (customer.deleted) {
    return false;
  }
  return customer.invoice_settings.default_payment_method !== null;
}

type StripeFlatTier = Stripe.Price.Tier & {
  up_to: number;
  flat_amount: number;
  unit_amount: 0 | null;
};

/**
 * Check if a tier is a flat tier.
 * A flat tier has a flat_amount, an up_to value and no unit_amount.
 */
function checkIsFlatTier(tier: Stripe.Price.Tier): tier is StripeFlatTier {
  return Boolean(tier.up_to && tier.flat_amount && !tier.unit_amount);
}

async function getIncludedScreenshotsFromStripeSubscription(
  stripeSubscription: Stripe.Subscription,
) {
  const firstItem = getFirstItemFromStripeSubscription(stripeSubscription);
  const price = firstItem.price;

  switch (price.billing_scheme) {
    case "tiered": {
      const { tiers } = await stripe.prices.retrieve(price.id, {
        expand: ["tiers"],
      });
      invariant(tiers);

      // Find the highest flat tier "up_to" value
      return tiers.reduce(
        (max, tier) => {
          if (!checkIsFlatTier(tier)) {
            return max;
          }
          return Math.max(max ?? 0, tier.up_to);
        },
        null as null | number,
      );
    }
    case "per_unit": {
      if (!price.tiers_mode) {
        if (
          "includedScreenshots" in price.metadata &&
          price.metadata["includedScreenshots"]
        ) {
          const includedScreenshots = Number(
            price.metadata["includedScreenshots"],
          );
          if (Number.isInteger(includedScreenshots)) {
            return includedScreenshots;
          }
        }
      }
      return null;
    }
    default:
      return null;
  }
}

async function getArgosSubscriptionDataFromStripe(
  stripeSubscription: Stripe.Subscription,
) {
  const stripeProductId = getFirstProductIdFromSubscription(stripeSubscription);
  const [plan, paymentMethodFilled, includedScreenshots] = await Promise.all([
    getPlanFromStripeProductId(stripeProductId),
    checkSubscriptionPaymentMethodFilled(stripeSubscription),
    getIncludedScreenshotsFromStripeSubscription(stripeSubscription),
  ]);
  const startDate = timestampToISOString(
    stripeSubscription.current_period_start,
  );
  const trialEndDate = stripeSubscription.trial_end
    ? timestampToISOString(stripeSubscription.trial_end)
    : null;
  const rawEndDate =
    stripeSubscription.ended_at || stripeSubscription.cancel_at;
  const endDate = rawEndDate ? timestampToISOString(rawEndDate) : null;

  return {
    planId: plan.id,
    provider: "stripe",
    stripeSubscriptionId: stripeSubscription.id,
    startDate,
    endDate,
    trialEndDate,
    paymentMethodFilled,
    status: stripeSubscription.status,
    includedScreenshots,
  } satisfies Partial<Subscription>;
}

export async function createArgosSubscriptionFromStripe({
  account,
  subscriberId,
  stripeSubscription,
}: {
  account: Account;
  subscriberId: string;
  stripeSubscription: Stripe.Subscription;
}): Promise<Subscription> {
  const data = await getArgosSubscriptionDataFromStripe(stripeSubscription);
  return Subscription.query().insertAndFetch({
    ...data,
    accountId: account.id,
    subscriberId,
  });
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.status === "canceled") {
    return;
  }
  await stripe.subscriptions.cancel(subscriptionId);
}

async function getArgosSubscriptionFromStripeSubscriptionId(
  stripeSubscriptionId: string,
) {
  const subscription = await Subscription.query().findOne({
    stripeSubscriptionId,
  });
  return subscription ?? null;
}

export async function getStripePriceFromPlanOrThrow(
  plan: Plan,
): Promise<Stripe.Price> {
  const { stripeProductId } = plan;
  invariant(stripeProductId, `"stripeProductId" is empty on plan ${plan.id}`);

  const stripeProduct = await stripe.products.retrieve(stripeProductId, {
    expand: ["default_price"],
  });
  invariant(stripeProduct, `stripe product not found for plan ${plan.id}`);

  const defaultPrice = stripeProduct.default_price;
  invariant(defaultPrice, `stripe default price not found for plan ${plan.id}`);
  invariant(
    typeof defaultPrice !== "string",
    `stripe default price is a string for plan ${plan.id}`,
  );

  return defaultPrice;
}

export async function updateStripeUsage({
  account,
  totalScreenshots,
}: {
  account: Account;
  totalScreenshots: number;
}): Promise<void> {
  const manager = account.$getSubscriptionManager();
  const subscription = await manager.getActiveSubscription();

  // No active subscription, nothing to do
  if (!subscription) {
    return;
  }

  // Only update usage for stripe subscriptions
  if (subscription.provider !== "stripe") {
    return;
  }

  const plan = await subscription.$relatedQuery("plan");

  // Only update usage for usage-based plans
  if (!plan.usageBased) {
    return;
  }

  // If provider is stripe, we should have a stripeSubscriptionId
  invariant(subscription.stripeSubscriptionId);

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    const item = getFirstItemFromStripeSubscription(stripeSubscription);

    await stripe.subscriptionItems.createUsageRecord(item.id, {
      action: "set",
      quantity: totalScreenshots,
    });
  } catch (error) {
    throw new Error("Error while updating stripe usage", {
      cause: error,
    });
  }
}

export async function getStripeProPlanOrThrow(): Promise<Plan> {
  return Plan.query()
    .findOne({ name: "pro", usageBased: true })
    .throwIfNotFound();
}

async function updateSubscriptionsFromCustomer(
  customerId: string,
): Promise<void> {
  const stripeSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    expand: ["data.customer"],
  });

  for (const stripeSubscription of stripeSubscriptions.data) {
    const argosSubscription =
      await getArgosSubscriptionFromStripeSubscriptionId(stripeSubscription.id);
    invariant(
      argosSubscription,
      `no Argos subscription found for Stripe subscription id ${stripeSubscription.id}`,
    );
    await updateArgosSubscriptionFromStripe(
      argosSubscription,
      stripeSubscription,
    );
  }
}

async function updateArgosSubscriptionFromStripe(
  argosSubscription: Subscription,
  stripeSubscription: Stripe.Subscription,
): Promise<Subscription> {
  const data = await getArgosSubscriptionDataFromStripe(stripeSubscription);
  return argosSubscription.$query().patchAndFetch(data);
}

export async function handleStripeEvent({
  data,
  type,
}: Pick<Stripe.Event, "data" | "type">): Promise<void> {
  switch (type) {
    case "payment_method.attached": {
      const paymentMethod = data.object as Stripe.PaymentMethod;
      invariant(
        typeof paymentMethod.customer === "string",
        "customer is not a string",
      );
      await updateSubscriptionsFromCustomer(paymentMethod.customer);
      return;
    }
    case "customer.deleted": {
      const customer = data.object as Stripe.Customer;

      await Account.query()
        .where({ stripeCustomerId: customer.id })
        .patch({ stripeCustomerId: null });

      return;
    }
    case "customer.updated": {
      const customer = data.object as Stripe.Customer;
      await updateSubscriptionsFromCustomer(customer.id);
      return;
    }

    case "checkout.session.completed": {
      const session = data.object as Stripe.Checkout.Session;

      const { accountId, subscriberId } =
        getClientReferenceIdFromSession(session);

      const stripeCustomerId = getCustomerIdFromSession(session);

      const account = await Account.query()
        .findById(accountId)
        .throwIfNotFound();

      if (account.stripeCustomerId !== stripeCustomerId) {
        await account.$clone().$query().patch({ stripeCustomerId });
      }

      await createArgosSubscriptionFromCheckoutSession({
        account,
        subscriberId,
        session,
        stripe,
      });

      return;
    }
    case "customer.subscription.updated": {
      const stripeSubscription = data.object as Stripe.Subscription;
      const argosSubscription =
        await getArgosSubscriptionFromStripeSubscriptionId(
          stripeSubscription.id,
        );
      invariant(
        argosSubscription,
        `no Argos subscription found for Stripe subscription id ${stripeSubscription.id}`,
      );
      await updateArgosSubscriptionFromStripe(
        argosSubscription,
        stripeSubscription,
      );
      return;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = data.object as Stripe.Subscription;
      const argosSubscription =
        await getArgosSubscriptionFromStripeSubscriptionId(
          stripeSubscription.id,
        );
      // Subscription can be null in case the team as been deleted
      if (!argosSubscription) {
        return;
      }
      await argosSubscription.$query().patch({ status: "canceled" });
      return;
    }

    default: {
      throw new Error(`Unhandled event type ${type}`);
    }
  }
}

/**
 * Get Stripe subscription data common to all subscriptions.
 */
export function getSubscriptionData(args: {
  accountId: string;
  subscriberId: string;
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
      subscriberId: args.subscriberId,
    },
  } satisfies Partial<Stripe.SubscriptionCreateParams>;
}

export async function createStripeCheckoutSession({
  plan,
  teamAccount,
  trial,
  subscriberAccount,
  successUrl,
  cancelUrl,
}: {
  plan: Plan;
  teamAccount: Account;
  trial: boolean;
  subscriberAccount: Account;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Response<Stripe.Checkout.Session>> {
  invariant(
    subscriberAccount.userId,
    "Subscriber account must be a user account",
  );

  const manager = teamAccount.$getSubscriptionManager();

  const [activeSubscription, price] = await Promise.all([
    manager.getActiveSubscription(),
    getStripePriceFromPlanOrThrow(plan),
  ]);

  invariant(!activeSubscription, "account already has an active subscription");

  return stripe.checkout.sessions.create({
    line_items: [{ price: price.id }],
    subscription_data: getSubscriptionData({
      trial,
      accountId: teamAccount.id,
      subscriberId: subscriberAccount.userId,
    }),
    mode: "subscription",
    client_reference_id: encodeStripeClientReferenceId({
      accountId: teamAccount.id,
      subscriberId: subscriberAccount.userId,
    }),
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_collection: trial ? "if_required" : "always",
    ...(teamAccount.stripeCustomerId && {
      customer: teamAccount.stripeCustomerId,
    }),
  });
}

async function getCustomerByEmail(
  email: string,
): Promise<Stripe.Customer | null> {
  const customers = await stripe.customers.list({ email });
  const first = customers.data[0];
  if (first) {
    return first;
  }

  return null;
}

async function getOrCreateCustomerByEmail(
  email: string,
): Promise<Stripe.Customer> {
  const existingCustomer = await getCustomerByEmail(email);
  if (existingCustomer) {
    return existingCustomer;
  }
  return stripe.customers.create({ email });
}

export async function getCustomerIdFromUserAccount(
  userAccount: Account,
): Promise<string | null> {
  if (userAccount.stripeCustomerId) {
    return userAccount.stripeCustomerId;
  }

  const user = await userAccount
    .$relatedQuery("user")
    .first()
    .throwIfNotFound();

  if (!user.email) {
    return null;
  }

  const stripeCustomer = await getOrCreateCustomerByEmail(user.email);
  return stripeCustomer.id;
}
