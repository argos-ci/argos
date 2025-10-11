import { invariant } from "@argos/util/invariant";
import Stripe from "stripe";
import { z } from "zod";

import config from "@/config/index.js";
import { Account, Plan, Subscription } from "@/database/models/index.js";
import { computeAdditionalScreenshots } from "@/database/services/additional-screenshots";
import { notifySubscriptionStatusUpdate } from "@/database/services/subscription";

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

function getSingleItemFromStripeSubscription(
  subscription: Stripe.Subscription,
  type: "screenshot" | "storybook_screenshot",
): Stripe.SubscriptionItem | null {
  // All addons prices have a metadata (type: "addon")
  const items = subscription.items.data.filter(
    (item) => item.price.metadata["type"] === type,
  );
  if (items.length === 0) {
    return null;
  }
  const item = items[0];
  if (!item) {
    return null;
  }
  invariant(items.length === 1, "multiple items found");
  return item;
}

function getPlanItemFromStripeSubscription(
  subscription: Stripe.Subscription,
): Stripe.SubscriptionItem {
  // All addons prices have a metadata (type: "addon")
  // all others are considered as plan prices.
  const planItems = subscription.items.data.filter((item) => {
    const type = item.price.metadata["type"];
    return (
      type !== "addon" &&
      type !== "screenshot" &&
      type !== "storybook_screenshot"
    );
  });
  const item = planItems[0];
  invariant(item, "no plan items found");
  invariant(planItems.length === 1, "multiple plan items found");
  return item;
}

function getPlanProductIdFromStripeSubscription(
  subscription: Stripe.Subscription,
): string {
  const item = getPlanItemFromStripeSubscription(subscription);
  const { product } = item.price;
  if (typeof product === "string") {
    return product;
  }
  return product.id;
}

function timestampToISOString(date: number): string {
  return new Date(date * 1000).toISOString();
}

export const stripe = new Stripe(config.get("stripe.apiKey"), {
  apiVersion: "2025-02-24.acacia",
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

type StripeUsageTier = Stripe.Price.Tier & {
  unit_amount_decimal: string;
};

/**
 * Check if a tier is a flat tier.
 * A flat tier has a flat_amount, an up_to value and no unit_amount.
 */
function checkIsFlatTier(tier: Stripe.Price.Tier): tier is StripeFlatTier {
  return Boolean(tier.up_to && tier.flat_amount && !tier.unit_amount);
}

/**
 * Check if a tier is a usage tier.
 * A usage tier has a unit_amount_decimal and no flat_amount.
 */
function checkIsUsageTier(tier: Stripe.Price.Tier): tier is StripeUsageTier {
  return Boolean(tier.unit_amount_decimal && !tier.flat_amount);
}

const CurrencySchema = z.enum(["usd", "eur"]);

/**
 * Retried the price informations collected from a Stripe subscription
 * and stored in Argos database.
 */
async function getPriceInfosFromStripeSubscription(
  stripeSubscription: Stripe.Subscription,
): Promise<
  Pick<
    Subscription,
    | "includedScreenshots"
    | "currency"
    | "additionalScreenshotPrice"
    | "additionalStorybookScreenshotPrice"
  >
> {
  const planItem = getPlanItemFromStripeSubscription(stripeSubscription);
  const { price } = planItem;
  const currency = CurrencySchema.parse(price.currency);

  switch (price.billing_scheme) {
    case "tiered": {
      const { tiers } = await stripe.prices.retrieve(price.id, {
        expand: ["tiers"],
      });
      invariant(tiers);

      // Find the highest flat tier "up_to" value
      const includedScreenshots = tiers.reduce(
        (max, tier) => {
          if (!checkIsFlatTier(tier)) {
            return max;
          }
          return Math.max(max ?? 0, tier.up_to);
        },
        null as null | number,
      );

      const usageTiers = tiers.filter((tier) => checkIsUsageTier(tier));
      const firstUsageTier = usageTiers[0];
      invariant(firstUsageTier, "no usage tier found");
      invariant(usageTiers.length === 1, "multiple usage tiers found");

      return {
        includedScreenshots,
        currency,
        additionalScreenshotPrice: decimalToNumber(
          firstUsageTier.unit_amount_decimal,
        ),
        additionalStorybookScreenshotPrice: null,
      };
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

          // If includedScreenshots is not present on the metadata,
          // then it is considered invalid
          if (Number.isInteger(includedScreenshots)) {
            const screenshotItem = getSingleItemFromStripeSubscription(
              stripeSubscription,
              "screenshot",
            );
            const storybookScreenshotItem = getSingleItemFromStripeSubscription(
              stripeSubscription,
              "storybook_screenshot",
            );

            return {
              includedScreenshots: includedScreenshots,
              currency,
              additionalScreenshotPrice: screenshotItem
                ? getUnitAmountFromPrice(screenshotItem.price)
                : null,
              additionalStorybookScreenshotPrice: storybookScreenshotItem
                ? getUnitAmountFromPrice(storybookScreenshotItem.price)
                : null,
            };
          }
        }
      }
      return {
        includedScreenshots: null,
        currency,
        additionalScreenshotPrice: null,
        additionalStorybookScreenshotPrice: null,
      };
    }
    default:
      return {
        includedScreenshots: null,
        currency,
        additionalScreenshotPrice: null,
        additionalStorybookScreenshotPrice: null,
      };
  }
}

/**
 * Get the unit amount from a Stripe price.
 */
function getUnitAmountFromPrice(price: Stripe.Price): number | null {
  invariant(price.unit_amount_decimal !== null, "unit_amount_decimal is null");
  return decimalToNumber(price.unit_amount_decimal);
}

/**
 * Convert a decimal string (e.g. "1000") to a number (e.g. 10.00).
 */
function decimalToNumber(value: string): number {
  return Number(value) / 100;
}

async function getArgosSubscriptionDataFromStripe(
  stripeSubscription: Stripe.Subscription,
) {
  const stripeProductId =
    getPlanProductIdFromStripeSubscription(stripeSubscription);
  const [plan, paymentMethodFilled, infos] = await Promise.all([
    getPlanFromStripeProductId(stripeProductId),
    checkSubscriptionPaymentMethodFilled(stripeSubscription),
    getPriceInfosFromStripeSubscription(stripeSubscription),
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
    ...infos,
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
  const completeSubscriptionData = {
    ...data,
    accountId: account.id,
    subscriberId,
  };
  const [newSubscription] = await Promise.all([
    Subscription.query().insertAndFetch(completeSubscriptionData),
    notifySubscriptionStatusUpdate({
      subscription: completeSubscriptionData,
      account,
    }),
  ]);
  return newSubscription;
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

/**
 * Get Stripe prices for the default team plan.
 */
export async function getDefaultTeamPlanItems(
  plan: Plan,
): Promise<{ price: string; quantity?: number }[]> {
  invariant(
    plan.stripeProductId,
    `"stripeProductId" is empty on plan ${plan.id}`,
  );

  const ids = [
    plan.stripeProductId,
    config.get("stripe.screenshotProductId"),
    config.get("stripe.storybookScreenshotProductId"),
  ];
  const products = await stripe.products.list({
    ids,
    expand: ["data.default_price"],
  });
  return ids.map((id) => {
    const product = products.data.find((product) => product.id === id);
    invariant(product, `stripe product not found (id: ${id})`);

    const defaultPrice = product.default_price;
    invariant(defaultPrice, `stripe default price not found (id: ${id})`);
    invariant(
      typeof defaultPrice !== "string",
      `stripe default price is a string (id: ${id})`,
    );
    if (defaultPrice.recurring?.usage_type !== "metered") {
      return { price: defaultPrice.id, quantity: 1 };
    }
    return { price: defaultPrice.id };
  });
}

/**
 * Check if a usage-based subscription is incomplete.
 * Meaning some information are missing to be able to use it.
 */
function checkIsUsageBasedSubscriptionIncomplete(
  subscription: Subscription,
): boolean {
  return (
    subscription.includedScreenshots === null ||
    subscription.additionalScreenshotPrice === null ||
    subscription.currency === null
  );
}

export async function updateStripeUsage(input: {
  account: Account;
  screenshots: { all: number; neutral: number; storybook: number };
  includedScreenshots: number;
}): Promise<void> {
  const { account, screenshots, includedScreenshots } = input;
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

    // If the subscription is incomplete, we need to update it,
    // could happen if we added a new information in the database.
    if (checkIsUsageBasedSubscriptionIncomplete(subscription)) {
      await updateArgosSubscriptionFromStripe(subscription, stripeSubscription);
    }

    // Get timestamp at second precision
    const timestamp = Math.ceil(Date.now() / 1000);
    const item = getPlanItemFromStripeSubscription(stripeSubscription);

    const stripeCustomerId = stripeSubscription.customer;
    invariant(typeof stripeCustomerId === "string");

    const additional = computeAdditionalScreenshots({
      included: includedScreenshots,
      neutral: screenshots.neutral,
      storybook: screenshots.storybook,
    });

    await Promise.all([
      // New plans are using metered events for screenshots tracking.
      stripe.billing.meterEvents.create({
        event_name: "screenshots",
        timestamp,
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: String(additional.neutral),
        },
      }),
      stripe.billing.meterEvents.create({
        event_name: "storybook_screenshots",
        timestamp,
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: String(additional.storybook),
        },
      }),
      // Whereas old plans are using usage records.
      item.plan.usage_type === "metered"
        ? stripe.subscriptionItems.createUsageRecord(item.id, {
            action: "set",
            quantity: screenshots.all,
            timestamp,
          })
        : null,
    ]);

    await subscription.$query().patch({
      usageUpdatedAt: new Date(timestamp * 1000).toISOString(),
    });
  } catch (error) {
    throw new Error("Error while updating stripe usage", {
      cause: error,
    });
  }
}

/**
 * Get the reference Pro plan used for subscription.
 */
export async function getStripeProPlanOrThrow(): Promise<Plan> {
  return Plan.query()
    .findOne({
      name: "pro",
      usageBased: true,
      // We have a legacy Pro plan that includes 15K
      includedScreenshots: 35000,
    })
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
  const [updatedSubscription] = await Promise.all([
    argosSubscription.$query().patchAndFetch(data),
    data.status !== argosSubscription.status
      ? notifySubscriptionStatusUpdate({
          subscription: { ...argosSubscription, ...data },
        })
      : Promise.resolve(),
  ]);
  return updatedSubscription;
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
      const subscriptionData = { status: "canceled" as const };
      await Promise.all([
        argosSubscription.$query().patch(subscriptionData),
        notifySubscriptionStatusUpdate({
          subscription: {
            ...argosSubscription,
            ...subscriptionData,
          },
        }),
      ]);
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

/**
 * Create the Stripe checkout session, used for Team subscription.
 */
export async function createStripeCheckoutSession(args: {
  plan: Plan;
  teamAccount: Account;
  trial: boolean;
  subscriberAccount: Account;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Response<Stripe.Checkout.Session>> {
  const { plan, teamAccount, trial, subscriberAccount, successUrl, cancelUrl } =
    args;
  invariant(
    subscriberAccount.userId,
    "Subscriber account must be a user account",
  );

  const manager = teamAccount.$getSubscriptionManager();

  const [activeSubscription, items] = await Promise.all([
    manager.getActiveSubscription(),
    getDefaultTeamPlanItems(plan),
  ]);

  invariant(!activeSubscription, "account already has an active subscription");

  return stripe.checkout.sessions.create({
    line_items: items,
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
