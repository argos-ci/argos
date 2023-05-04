import type Stripe from "stripe";

import { transaction } from "@argos-ci/database";
import { Account, Plan, Purchase } from "@argos-ci/database/models";

export const getSubscriptionCustomerOrThrow = (
  subscription: Stripe.Subscription
) => {
  const stripeCustomerId = subscription.customer as string;
  if (!stripeCustomerId) {
    throw new Error(`empty customer in subscriptionId "${subscription.id}"`);
  }
  return stripeCustomerId;
};

export const getSessionSubscriptionOrThrow = (
  session: Stripe.Checkout.Session
) => {
  const subscription = session.subscription as Stripe.Subscription;
  if (!subscription) {
    throw new Error(`empty subscription in session "${session.id}"`);
  }
  return subscription;
};

export const getInvoiceCustomerOrThrow = (invoice: Stripe.Invoice) => {
  const stripeCustomerId = invoice.customer as string;
  if (!stripeCustomerId) {
    throw new Error(`empty customer in invoiceId "${invoice.id}"`);
  }
  return stripeCustomerId;
};

export const findPlanOrThrow = async (stripeProductId: string) => {
  return Plan.query()
    .findOne({ stripePlanId: stripeProductId })
    .throwIfNotFound({
      message: `can't find plan with stripeProductId: "${stripeProductId}"`,
    });
};

export const findCustomerAccountOrThrow = async (stripeCustomerId: string) => {
  return Account.query()
    .findOne({ stripeCustomerId })
    .throwIfNotFound({
      message: `can't find account with stripeCustomerId: "${stripeCustomerId}"`,
    });
};

export const getLastPurchase = async (account: Account) => {
  const activePurchase = await account.$getActivePurchase();
  if (activePurchase) return activePurchase;
  return Purchase.query()
    .where({ accountId: account.id })
    .where("startDate", "<=", "now()")
    .orderBy("endDate", "DESC")
    .first();
};

export const getPendingPurchases = async (account: Account) => {
  return Purchase.query()
    .where("accountId", account.id)
    .where("startDate", ">", "now()")
    .where((query) =>
      query.whereNull("endDate").orWhere("endDate", ">=", "now()")
    );
};

export const updatePurchase = async ({
  activePurchase,
  account,
  plan,
  effectiveDate,
}: {
  activePurchase: Purchase;
  account: Account;
  plan: Plan;
  effectiveDate: string;
}) => {
  const pendingPurchases = await getPendingPurchases(account);

  transaction(async (trx) => {
    await Promise.all([
      Purchase.query(trx)
        .patch({ endDate: effectiveDate })
        .findById(activePurchase!.id),
      Purchase.query(trx).insert({
        planId: plan.id,
        accountId: account.id,
        source: "stripe",
        startDate: effectiveDate,
      }),

      ...(pendingPurchases.length > 0
        ? [
            Purchase.query(trx)
              .patch({ endDate: new Date().toISOString() })
              .whereIn(
                "id",
                pendingPurchases.map(({ id }) => id)
              ),
          ]
        : []),
    ]);
  });
};

export const timestampToDate = (date: number) =>
  new Date(date * 1000).toISOString();

export const getEffectiveDate = async ({
  newPlan,
  activePurchase,
  renewalDate,
}: {
  newPlan: Plan;
  activePurchase: Purchase;
  renewalDate: number;
}) => {
  const oldPlan = (await Plan.query().findById(activePurchase.planId)) as Plan;
  return newPlan.screenshotsLimitPerMonth < oldPlan.screenshotsLimitPerMonth
    ? timestampToDate(renewalDate)
    : new Date().toISOString();
};

export const getSessionCustomerIdOrThrow = (
  session: Stripe.Checkout.Session
) => {
  const stripeCustomerId = session.customer as string;
  if (!session.customer) {
    throw new Error(`empty customer in stripe session "${session.id}"`);
  }
  return stripeCustomerId;
};

export const getClientReferenceIdPayload = (
  session: Stripe.Checkout.Session
) => {
  const clientReferenceId = session.client_reference_id as string;
  if (!clientReferenceId) {
    throw new Error(
      `empty clientReferenceId in stripe session "${session.id}"`
    );
  }
  const { accountId, purchaserId } =
    Purchase.decodeStripeClientReferenceId(clientReferenceId);
  if (!accountId || !purchaserId) {
    throw new Error(`invalid stripe clientReferenceId "${clientReferenceId}"`);
  }
  return { accountId, purchaserId };
};

export const getFirstProductOrThrow = (subscription: Stripe.Subscription) => {
  if (!subscription.items.data[0]) {
    throw new Error("no item found in Stripe subscription");
  }
  return subscription.items.data[0].price!.product as string;
};
