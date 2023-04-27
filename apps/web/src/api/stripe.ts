import bodyParser from "body-parser";
import express from "express";
import Stripe from "stripe";

import config from "@argos-ci/config";
import { transaction } from "@argos-ci/database";
import { Account, Plan, Purchase } from "@argos-ci/database/models";
import logger from "@argos-ci/logger";

import { asyncHandler } from "../util.js";

const router = express.Router();
const stripe = new Stripe(config.get("stripe.apiKey"), {
  apiVersion: "2022-11-15",
  typescript: true,
});

const getSubscriptionCustomerOrThrow = (subscription: Stripe.Subscription) => {
  const stripeCustomerId = subscription.customer as string;
  if (!stripeCustomerId) {
    throw new Error(`empty customer in subscriptionId "${subscription.id}"`);
  }
  return stripeCustomerId;
};

const getInvoiceCustomerOrThrow = (invoice: Stripe.Invoice) => {
  const stripeCustomerId = invoice.customer as string;
  if (!stripeCustomerId) {
    throw new Error(`empty customer in invoiceId "${invoice.id}"`);
  }
  return stripeCustomerId;
};

const findPlanOrThrow = async (stripeProductId: string) => {
  const plan = await Plan.query().findOne({ stripePlanId: stripeProductId });
  if (!plan) {
    throw new Error(
      `can't find plan with stripeProductId: "${stripeProductId}"`
    );
  }
  return plan;
};

const findCustomerAccountOrThrow = async (stripeCustomerId: string) => {
  const account = await Account.query().findOne({ stripeCustomerId });
  if (!account) {
    throw new Error(
      `no account found for stripe stripeCustomerId: "${stripeCustomerId}"`
    );
  }
  return account;
};

const getLastPurchase = async (account: Account) => {
  const activePurchase = await account.getActivePurchase();
  if (activePurchase) return activePurchase;
  return Purchase.query()
    .where({ accountId: account.id })
    .whereRaw("?? <= now()", "startDate")
    .orderBy("endDate", "DESC")
    .first();
};

const getPendingPurchases = async (account: Account) => {
  return Purchase.query()
    .where("accountId", account.id)
    .whereRaw("??::DATE > now()", "startDate")
    .where((query) =>
      query.whereNull("endDate").orWhereRaw("?? >= now()", "endDate")
    );
};

const updatePurchase = async ({
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

const timestampToDate = (date: number) => new Date(date * 1000).toISOString();

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

const getSessionCustomerIdOrThrow = (session: Stripe.Checkout.Session) => {
  const stripeCustomerId = session.customer as string;
  if (!session.customer) {
    throw new Error(`empty customer in sessionId "${session.id}"`);
  }
  return stripeCustomerId;
};

const getClientReferenceIdPayload = (session: Stripe.Checkout.Session) => {
  const clientReferenceId = session.client_reference_id as string;
  if (!clientReferenceId) {
    throw new Error(
      `empty clientReferenceId in stripe sessionId "${session.id}"`
    );
  }
  const { accountId, purchaserId } =
    Purchase.decodeStripeClientReferenceId(clientReferenceId);
  if (!accountId || !purchaserId) {
    throw new Error(`invalid stripe clientReferenceId "${clientReferenceId}"`);
  }
  return { accountId, purchaserId };
};

const getFirstProductOrThrow = (subscription: Stripe.Subscription) => {
  if (!subscription.items.data[0]) {
    throw new Error("no item found in Stripe subscription");
  }
  return subscription.items.data[0].price!.product as string;
};

const findSessionPlan = async (initialSession: Stripe.Checkout.Session) => {
  const session = (await stripe.checkout.sessions.retrieve(initialSession.id, {
    expand: ["line_items"],
  })) as Stripe.Checkout.Session;
  const stripeProductId = session.line_items!.data[0]?.price!.product as string;
  return findPlanOrThrow(stripeProductId);
};

export const updateStripeUsage = async (account: Account) => {
  try {
    const stripeCustomerId = account.stripeCustomerId;
    if (!stripeCustomerId) return;

    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      customer: stripeCustomerId,
      expand: ["items"],
    });
    if (subscriptions.data.length > 1) {
      throw new Error(
        `Can't update usage. Stripe return multiple active subscriptions for account ${account.id}`
      );
    }
    const subscription = subscriptions.data[0];
    const meteredPricing =
      subscription?.items.data[0]?.price.recurring?.usage_type === "metered";
    if (!meteredPricing) return;

    const quantity = await account.getScreenshotsCurrentConsumption();
    await stripe.subscriptionItems.createUsageRecord(subscription.id, {
      action: "set",
      quantity,
    });
  } catch (e) {
    throw new Error("error updating stripe usage.", {
      cause: e instanceof Error ? e.message : String(e),
    });
  }
};

export const handleStripeEvent = async ({
  data,
  eventType,
}: {
  data: Stripe.Event.Data;
  eventType: string;
}) => {
  switch (eventType) {
    case "checkout.session.completed": {
      const session: Stripe.Checkout.Session =
        data.object as Stripe.Checkout.Session;
      const { accountId, purchaserId } = getClientReferenceIdPayload(session);
      const stripeCustomerId = getSessionCustomerIdOrThrow(session);
      const account = await Account.query().patchAndFetchById(accountId, {
        stripeCustomerId,
      });

      if (!account) {
        throw new Error(`no account found for with accountId: "${accountId}"`);
      }
      const activePurchase = await account.getActivePurchase();

      if (activePurchase) {
        await activePurchase.$query().patch({ purchaserId });
        break;
      }

      const plan = await findSessionPlan(session);
      await Purchase.query().insert({
        planId: plan.id,
        accountId: account.id,
        source: "stripe",
        purchaserId,
        startDate: new Date().toISOString(),
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
          query.whereNull("endDate").orWhereRaw("?? >= now()", "endDate")
        );
      break;
    }

    default:
      console.log(`Unhandled event type ${eventType}`);
  }
};

router.post(
  "/stripe/event-handler",
  bodyParser.raw({ type: "application/json" }),
  async (req: express.Request, res: express.Response): Promise<void> => {
    let event: Stripe.Event;
    const signature = req.headers["stripe-signature"] as string;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        config.get("stripe.webhookSecret")
      );
    } catch (err) {
      throw new Error("Stripe webhook signature verification failed");
    }

    const data: Stripe.Event.Data = event.data;
    const eventType: string = event.type;

    logger.info("Stripe event", eventType);
    await handleStripeEvent({ data, eventType });

    res.sendStatus(200);
  }
);

router.post(
  "/stripe/create-customer-portal-session",
  express.urlencoded({ extended: false }),
  asyncHandler(async (req, res) => {
    const { stripeCustomerId } = req.body;

    if (!stripeCustomerId) {
      throw new Error("stripe customer id missing");
    }
    const account = await Account.query().findOne({ stripeCustomerId });

    if (!account) {
      throw new Error(
        `no account found with stripeCustomerId: "${stripeCustomerId}"`
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: new URL(`/${account.slug}/settings`, config.get("server.url"))
        .href,
    });

    res.redirect(303, portalSession.url);
  })
);

export default router;
