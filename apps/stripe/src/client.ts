import Stripe from "stripe";

import config from "@argos-ci/config";
import { Account, Purchase } from "@argos-ci/database/models";

import {
  findCustomerAccountOrThrow,
  findPlanOrThrow,
  getClientReferenceIdPayload,
  getEffectiveDate,
  getFirstProductOrThrow,
  getInvoiceCustomerOrThrow,
  getLastPurchase,
  getSessionCustomerIdOrThrow,
  getSessionSubscriptionOrThrow,
  getSubscriptionCustomerOrThrow,
  timestampToDate,
  updatePurchase,
} from "./utils.js";

export type { Stripe };

export const stripe = new Stripe(config.get("stripe.apiKey"), {
  apiVersion: "2022-11-15",
  typescript: true,
});

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

    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      customer: stripeCustomerId,
      expand: ["data.items"],
    });
    if (subscriptions.data.length > 1) {
      throw new Error(
        `Can't update usage. Stripe return multiple active subscriptions for account ${account.id}`
      );
    }

    const subscription = subscriptions.data[0];
    if (!subscription) {
      return null;
    }

    const meteredPricing =
      subscription.items.data[0]?.price.recurring?.usage_type === "metered";
    if (!meteredPricing) {
      return null;
    }

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

      const activePurchase = await account.getActivePurchase();
      if (activePurchase) {
        await activePurchase.$query().patch({ purchaserId });
        break;
      }

      const retrievedSession = await stripe.checkout.sessions.retrieve(
        session.id,
        { expand: ["subscription"] }
      );

      const subscription = getSessionSubscriptionOrThrow(retrievedSession);
      const stripeProductId = getFirstProductOrThrow(subscription);
      const plan = await findPlanOrThrow(stripeProductId);

      await Purchase.query().insert({
        planId: plan.id,
        accountId: account.id,
        source: "stripe",
        purchaserId,
        startDate: new Date().toISOString(),
        trialEndDate: subscription.trial_end
          ? timestampToDate(subscription.trial_end)
          : null,
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

      const activePurchase = await account.getActivePurchase();
      if (activePurchase) {
        await Purchase.query()
          .patch({ endDate: timestampToDate(invoice.period_start) })
          .findById(activePurchase.id);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription: Stripe.Subscription =
        data.object as Stripe.Subscription;
      const stripeCustomerId: string =
        getSubscriptionCustomerOrThrow(subscription);
      const stripeProductId = getFirstProductOrThrow(subscription);
      const plan = await findPlanOrThrow(stripeProductId);
      const account = await findCustomerAccountOrThrow(stripeCustomerId);
      const activePurchase = await account.getActivePurchase();

      if (subscription.cancel_at) {
        if (!activePurchase) {
          throw new Error(`can't find purchase for accountId "${account.id}"`);
        }
        await activePurchase
          .$query()
          .patch({ endDate: timestampToDate(subscription.cancel_at) });
        break;
      }

      if (!activePurchase) {
        await Purchase.query().insert({
          planId: plan.id,
          accountId: account.id,
          source: "stripe",
          startDate: timestampToDate(subscription.start_date),
          trialEndDate: subscription.trial_end
            ? timestampToDate(subscription.trial_end)
            : null,
        });
        break;
      }

      if (activePurchase.planId !== plan.id) {
        const effectiveDate = (await getEffectiveDate({
          newPlan: plan,
          activePurchase,
          renewalDate: subscription.current_period_end,
        })) as string;
        await updatePurchase({ account, plan, effectiveDate, activePurchase });
      }

      if (activePurchase.endDate) {
        await Purchase.query()
          .patch({ endDate: null })
          .findById(activePurchase.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription: Stripe.Subscription =
        data.object as Stripe.Subscription;
      const stripeCustomerId = getSubscriptionCustomerOrThrow(
        subscription
      ) as string;
      const account = await findCustomerAccountOrThrow(stripeCustomerId);
      await Purchase.query()
        .patch({ endDate: timestampToDate(subscription.current_period_end) })
        .where({ accountId: account.id })
        .where((query) =>
          query.whereNull("endDate").orWhere("endDate", ">=", "now()")
        );
      break;
    }

    default:
      console.log(`Unhandled event type ${type}`);
  }
};
