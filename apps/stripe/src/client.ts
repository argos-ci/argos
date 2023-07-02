import Stripe from "stripe";

import config from "@argos-ci/config";
import { Account, Plan, Purchase } from "@argos-ci/database/models";

import {
  changeActivePurchase,
  findCustomerAccountOrThrow,
  findPlanOrThrow,
  getClientReferenceIdPayload,
  getEffectiveDate,
  getFirstProductOrThrow,
  getInvoiceCustomerOrThrow,
  getLastPurchase,
  getPendingPurchases,
  getSessionCustomerIdOrThrow,
  getSessionSubscriptionOrThrow,
  getSubscriptionCustomerOrThrow,
  timestampToDate,
} from "./utils.js";

export type { Stripe };

export { timestampToDate };

export const stripe = new Stripe(config.get("stripe.apiKey"), {
  apiVersion: "2022-11-15",
  typescript: true,
});

export const createPurchaseFromSubscription = async ({
  account,
  purchaserId,
  subscription,
}: {
  account: Account;
  purchaserId: string;
  subscription: Stripe.Subscription;
}) => {
  const stripeProductId = getFirstProductOrThrow(subscription);
  const plan = await findPlanOrThrow(stripeProductId);
  const paymentMethodFilled = subscription.default_payment_method !== null;

  return Purchase.query().insertAndFetch({
    planId: plan.id,
    accountId: account.id,
    source: "stripe",
    purchaserId,
    startDate: new Date().toISOString(),
    trialEndDate: subscription.trial_end
      ? timestampToDate(subscription.trial_end)
      : null,
    paymentMethodFilled,
  });
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
      `stripe return multiple active prices found for plan ${plan.id}`
    );
  }

  const price = prices.data[0];

  if (!price) {
    throw new Error(`stripe price not found for plan ${plan.id}`);
  }

  return price;
};

export const getCustomerSubscriptionOrThrow = async (
  stripeCustomerId: string
) => {
  const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
    stripe.subscriptions.list({
      status: "active",
      customer: stripeCustomerId,
      expand: ["data.items"],
    }),
    stripe.subscriptions.list({
      status: "trialing",
      customer: stripeCustomerId,
      expand: ["data.items"],
    }),
  ]);
  const subscriptions = [
    ...activeSubscriptions.data,
    ...trialingSubscriptions.data,
  ];
  if (subscriptions.length > 1) {
    throw new Error(
      `Stripe returns more than one active subscriptions for customer ${stripeCustomerId}`
    );
  }

  const subscription = subscriptions[0];
  if (!subscription) {
    throw new Error(
      `Stripe returns no active subscriptions for customer ${stripeCustomerId}`
    );
  }

  return subscription;
};

export const terminateStripeTrial = async (stripeSubscriptionId: string) => {
  await stripe.subscriptions.update(stripeSubscriptionId, { trial_end: "now" });
  return;
};
export const updateStripeUsage = async ({
  account,
  totalScreenshots,
}: {
  account: Account;
  totalScreenshots: number;
}) => {
  try {
    const stripeCustomerId = account.stripeCustomerId;
    if (!stripeCustomerId) {
      return null;
    }

    const subscription = await getCustomerSubscriptionOrThrow(stripeCustomerId);
    const usage = await stripe.subscriptionItems.createUsageRecord(
      subscription.items.data[0]!.id,
      { action: "set", quantity: totalScreenshots }
    );
    return usage.quantity;
  } catch (e) {
    throw new Error("error updating stripe usage.", {
      cause: e instanceof Error ? e.message : String(e),
    });
  }
};

export const getStripeProPlanOrThrow = async () => {
  return Plan.query()
    .findOne({ name: "pro", usageBased: true })
    .throwIfNotFound();
};

export const handleStripeEvent = async ({
  data,
  type,
}: Pick<Stripe.Event, "data" | "type">) => {
  switch (type) {
    case "checkout.session.completed": {
      const session: Stripe.Checkout.Session =
        data.object as Stripe.Checkout.Session;

      const { accountId, purchaserId } = getClientReferenceIdPayload(session);
      const stripeCustomerId = getSessionCustomerIdOrThrow(session);
      const account = await Account.query()
        .patchAndFetchById(accountId, { stripeCustomerId })
        .throwIfNotFound({
          message: `can't find account with id "${accountId}"`,
        });

      const activePurchase = await account.$getActivePurchase();
      if (activePurchase) {
        await activePurchase.$query().patch({ purchaserId });
        break;
      }

      const retrievedSession = await stripe.checkout.sessions.retrieve(
        session.id,
        { expand: ["subscription"] }
      );

      const subscription = getSessionSubscriptionOrThrow(retrievedSession);

      await createPurchaseFromSubscription({
        account,
        purchaserId,
        subscription,
      });

      break;
    }

    case "invoice.paid": {
      const invoice: Stripe.Invoice = data.object as Stripe.Invoice;
      const stripeCustomerId = getInvoiceCustomerOrThrow(invoice) as string;
      const account = await Account.query().findOne({ stripeCustomerId });
      if (!account) {
        break;
      }

      const lastPurchase = await getLastPurchase(account);
      if (lastPurchase?.endDate) {
        await Purchase.query()
          .patch({ endDate: null })
          .findById(lastPurchase.id);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice: Stripe.Invoice = data.object as Stripe.Invoice;
      const stripeCustomerId = getInvoiceCustomerOrThrow(invoice) as string;
      const account = await Account.query().findOne({ stripeCustomerId });
      if (!account) {
        break;
      }

      const activePurchase = await account.$getActivePurchase();
      if (activePurchase) {
        await Purchase.query()
          .patch({ endDate: timestampToDate(invoice.period_start) })
          .findById(activePurchase.id);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = data.object as Stripe.Subscription;
      const stripeCustomerId: string =
        getSubscriptionCustomerOrThrow(subscription);
      const stripeProductId = getFirstProductOrThrow(subscription);
      const [plan, account] = await Promise.all([
        findPlanOrThrow(stripeProductId),
        findCustomerAccountOrThrow(stripeCustomerId),
      ]);
      const activePurchase = await account.$getActivePurchase();

      const paymentMethodFilled = subscription.default_payment_method !== null;
      const trialEndDate = subscription.trial_end
        ? timestampToDate(subscription.trial_end)
        : null;
      const subscriptionEnd = subscription.ended_at || subscription.cancel_at;
      const endDate = subscriptionEnd ? timestampToDate(subscriptionEnd) : null;

      const newPurchaseProps = {
        planId: plan.id,
        accountId: account.id,
        source: "stripe",
        startDate: timestampToDate(subscription.start_date),
        trialEndDate,
        paymentMethodFilled,
        endDate,
      };

      if (!activePurchase) {
        await Purchase.query().insert(newPurchaseProps);
        break;
      }

      if (plan && activePurchase.planId !== plan.id) {
        const [effectiveDate, pendingPurchases] = await Promise.all([
          getEffectiveDate({
            newPlan: plan,
            activePurchase,
            renewalDate: subscription.current_period_end,
          }),
          getPendingPurchases(account.id),
        ]);
        await changeActivePurchase({
          activePurchaseId: activePurchase.id,
          effectiveDate,
          newPurchaseProps,
          pendingPurchases,
        });
        break;
      }

      await Purchase.query()
        .patch({ trialEndDate, paymentMethodFilled, endDate })
        .findById(activePurchase.id);
      break;
    }

    default:
      console.log(`Unhandled event type ${type}`);
  }
};

export const getTrialSubscriptionConfig = () => {
  return {
    trial_settings: {
      end_behavior: { missing_payment_method: "cancel" as const },
    },
    trial_period_days: 14,
  };
};

export const createStripeCheckoutSession = async ({
  plan,
  account,
  trial,
  purchaserAccount,
  successUrl,
  cancelUrl,
}: {
  plan: Plan;
  account: Account;
  trial: boolean;
  purchaserAccount: Account;
  successUrl: string;
  cancelUrl: string;
}) => {
  if (!purchaserAccount.userId) {
    throw new Error("Purchaser account must be a user account");
  }

  const [activePurchase, price] = await Promise.all([
    account.$getActivePurchase(),
    getStripePriceFromPlanOrThrow(plan),
  ]);

  if (activePurchase) {
    throw new Error("Account already has an active purchase");
  }

  const customer =
    account.stripeCustomerId ??
    (await getOrCreateUserCustomerId(purchaserAccount));

  return stripe.checkout.sessions.create({
    line_items: [{ price: price.id }],
    subscription_data: trial ? getTrialSubscriptionConfig() : {},
    ...(customer && { customer }),
    mode: "subscription",
    client_reference_id: Purchase.encodeStripeClientReferenceId({
      accountId: account.id,
      purchaserId: purchaserAccount.userId,
    }),
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_collection: "if_required",
  });
};

export const getOrCreateUserCustomerId = async (
  userAccount: Account
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

  const customer = await stripe.customers.create({
    email: user.email,
  });

  await userAccount.$query().patch({ stripeCustomerId: customer.id });

  return customer.id;
};
