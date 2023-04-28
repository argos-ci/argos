import type Stripe from "stripe";

import { Account, Plan, Purchase, Team, User } from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";

import {
  PAID_INVOICE_PAYLOAD,
  PAYMENT_FAILED_INVOICE_PAYLOAD,
  SUBSCRIPTION_CANCEL_PAYLOAD,
  SUBSCRIPTION_UPDATE_PAYLOAD,
} from "../__fixtures__/stripe-payloads.js";
import { handleStripeEvent, stripe, updateStripeUsage } from "./client.js";
import { getEffectiveDate } from "./utils.js";

const now = new Date();
const previousMonth = new Date(
  now.getFullYear(),
  now.getMonth() - 1,
  now.getDate()
);
const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const nextMonth = new Date(
  now.getFullYear(),
  now.getMonth() + 1,
  now.getDate()
);

const getOrCreateActivePurchase = async (account: Account, plan: Plan) => {
  const activePurchase = await account.getActivePurchase();
  if (activePurchase) {
    return activePurchase;
  }
  return factory.create("Purchase", {
    accountId: account.id,
    planId: plan.id,
    source: "stripe",
    startDate: startOfPreviousMonth.toISOString(),
  });
};

const getOrCreateSubscription = async (customerId: string, priceId: string) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
  });
  if (subscriptions.data.length > 1) {
    throw new Error(`Stripe return multiple active subscriptions`);
  }

  if (subscriptions.data.length > 0) {
    return subscriptions.data[0] as Stripe.Subscription;
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
  });
  return subscription;
};

describe("stripe", () => {
  useDatabase();

  describe("#getEffectiveDate", () => {
    const renewalDate = 2674745463; // Sunday 4 October 2054 16:51:03
    let starterPlan: Plan;
    let standardPlan: Plan;
    let proPlan: Plan;
    let activePurchase: Purchase;

    beforeEach(async () => {
      [starterPlan, standardPlan, proPlan] = (await factory.createMany("Plan", [
        { screenshotsLimitPerMonth: 40_000 },
        { screenshotsLimitPerMonth: 250_000 },
        { screenshotsLimitPerMonth: 1_000_000 },
      ])) as [Plan, Plan, Plan];

      activePurchase = (await factory.create("Purchase", {
        planId: standardPlan.id,
        source: "stripe",
        startDate: previousMonth.toISOString(),
      })) as Purchase;
    });

    it("returns current date for plan upgrade", async () => {
      const effectiveDate = await getEffectiveDate({
        activePurchase,
        newPlan: proPlan,
        renewalDate,
      });
      expect(new Date(effectiveDate).toDateString()).toBe(
        new Date().toDateString()
      );
    });

    it("returns current date when plan is not updated", async () => {
      const effectiveDate = await getEffectiveDate({
        activePurchase,
        newPlan: standardPlan,
        renewalDate,
      });
      expect(new Date(effectiveDate).toDateString()).toBe(
        new Date().toDateString()
      );
    });

    it("returns renewal date for plan downgrade", async () => {
      const effectiveDate = await getEffectiveDate({
        activePurchase,
        newPlan: starterPlan,
        renewalDate,
      });

      expect(new Date(effectiveDate).toDateString()).toBe(
        new Date(renewalDate * 1000).toDateString()
      );
    });
  });

  describe("handleStripeEvent", () => {
    describe("checkout.session.completed", () => {
      const customerId = "cus_N4XieLog1nIDoP";
      const accountId = "9";
      const stripePlanId = "prod_MzEavomA8VeCvW";
      const purchaserId = "7";
      let account: Account;
      let plan: Plan;
      let team: Team;
      let session: Stripe.Checkout.Session;

      beforeAll(async () => {
        session = await stripe.checkout.sessions.create({
          success_url: "https://app.argos-ci.dev:4002/checkout-success",
          line_items: [
            { price: "price_1MFG6qHOD9RpIFZdHlE46OrK", quantity: 1 },
          ],
          mode: "subscription",
          customer: customerId,
          client_reference_id:
            "eyJhY2NvdW50SWQiOiI5IiwicHVyY2hhc2VySWQiOiI3In0_",
        });
      });

      beforeEach(async () => {
        [team, plan] = await Promise.all([
          factory.create<Team>("Team"),
          factory.create<Plan>("Plan", { stripePlanId }),
          factory.create<User>("User", { id: purchaserId }),
        ]);

        await factory.create<Account>("TeamAccount", {
          teamId: team.id,
          id: accountId,
        });

        await handleStripeEvent({
          data: { object: session },
          type: "checkout.session.completed",
        });

        account = (await Account.query().findById(accountId)) as Account;
      });

      it("throws without customer", async () => {
        await expect(
          handleStripeEvent({
            data: { object: { ...session, customer: null } },
            type: "checkout.session.completed",
          })
        ).rejects.toThrowError(/^empty customer in stripe session/);
      });

      it("throws without clientReferenceId", async () => {
        await expect(
          handleStripeEvent({
            data: { object: { ...session, client_reference_id: null } },
            type: "checkout.session.completed",
          })
        ).rejects.toThrowError(/^empty clientReferenceId in stripe session/);
      });

      it("throws with unknown clientReferenceId", async () => {
        const accountId = "5555";
        const clientReferenceId = Purchase.encodeStripeClientReferenceId({
          accountId,
          purchaserId: "1234",
        });
        await expect(
          handleStripeEvent({
            data: {
              object: { ...session, client_reference_id: clientReferenceId },
            },
            type: "checkout.session.completed",
          })
        ).rejects.toThrowError(`can't find account with id "${accountId}"`);
      });

      it("should add stripeCustomerId to account", async () => {
        expect(account.stripeCustomerId).toBe(customerId);
      });

      it("create a purchase", async () => {
        const activePurchase = await account.getActivePurchase();
        expect(activePurchase).toMatchObject({
          planId: plan.id,
          accountId: account.id,
          endDate: null,
          source: "stripe",
          purchaserId,
        });
      });
    });

    describe("invoice.paid", () => {
      const payload = PAID_INVOICE_PAYLOAD;
      const stripeCustomerId = payload.customer;
      const productId = payload.lines.data[0]!.price.product;
      let account: Account;
      let payloadPlan: Plan;

      beforeEach(async () => {
        [payloadPlan, account] = await Promise.all([
          factory.create<Plan>("Plan", { stripePlanId: productId }),
          factory.create<Account>("TeamAccount", { stripeCustomerId }),
        ]);

        await factory.create<Purchase>("Purchase", {
          accountId: account.id,
          planId: payloadPlan.id,
          source: "stripe",
          endDate: nextMonth.toISOString(),
          startDate: startOfPreviousMonth.toISOString(),
        });
      });

      it("throws without customer", async () => {
        await expect(
          handleStripeEvent({
            data: { object: { ...payload, customer: null } },
            type: "invoice.paid",
          })
        ).rejects.toThrowError(
          'empty customer in invoiceId "in_1MJ2CAHOD9RpIFZduH2xtn7k"'
        );
      });

      it("remove purchase end date", async () => {
        await handleStripeEvent({
          data: { object: payload },
          type: "invoice.paid",
        });
        const purchase = (await account.getActivePurchase()) as Purchase;
        expect(purchase.endDate).toBeNull();
      });
    });

    describe("invoice.payment_failed", () => {
      const payload = PAYMENT_FAILED_INVOICE_PAYLOAD;
      const stripeCustomerId = payload.customer;
      let account: Account;
      let plan: Plan;

      beforeEach(async () => {
        [account, plan] = await Promise.all([
          factory.create<Account>("TeamAccount", { stripeCustomerId }),
          factory.create<Plan>("Plan"),
        ]);
      });

      it("should not throw when account not found", async () => {
        await expect(
          handleStripeEvent({
            data: { object: { ...payload, customer: "XXX001" } },
            type: "invoice.payment_failed",
          })
        ).resolves.not.toThrowError();
      });

      it("should not throw when purchase not found", async () => {
        await factory.create<Purchase>("Purchase", {
          accountId: account.id,
          planId: plan.id,
          source: "stripe",
          startDate: startOfPreviousMonth.toISOString(),
        });

        await expect(
          handleStripeEvent({
            data: { object: { ...payload, customer: "XXX001" } },
            type: "invoice.payment_failed",
          })
        ).resolves.not.toThrowError();
      });

      it("fill purchase's end date", async () => {
        const purchase = (await getOrCreateActivePurchase(
          account,
          plan
        )) as Purchase;
        expect(purchase.endDate).toBeNull();
        await handleStripeEvent({
          data: { object: payload },
          type: "invoice.payment_failed",
        });
        const updatedPurchase = (await purchase.$query()) as Purchase;
        expect(updatedPurchase!.endDate).not.toBeNull();
      });
    });

    describe("customer.subscription.updated", () => {
      const payload = SUBSCRIPTION_UPDATE_PAYLOAD;
      const stripeCustomerId = payload.customer;
      const stripePlanId = payload.items.data[0]!.price.product;
      let account: Account;
      let oldPlan: Plan;
      let newPlan: Plan;
      let oldPurchase: Purchase;
      let pendingPurchase: Purchase;

      beforeEach(async () => {
        [account, [oldPlan, newPlan]] = (await Promise.all([
          factory.create<Account>("TeamAccount", { stripeCustomerId }),
          factory.createMany<Plan>("Plan", [
            { stripePlanId: "XXX_01_XXX", screenshotsLimitPerMonth: 7000 },
            { stripePlanId, screenshotsLimitPerMonth: 40000 },
          ]),
        ])) as [Account, [Plan, Plan]];
      });

      it("deletion doesn't create purchase", async () => {
        await factory.create<Purchase>("Purchase", {
          accountId: account.id,
          planId: oldPlan.id,
          source: "stripe",
          startDate: startOfPreviousMonth.toISOString(),
        });
        await handleStripeEvent({
          data: { object: { ...payload, cancel_at: "1234" } },
          type: "customer.subscription.updated",
        });
        const purchases = await Purchase.query()
          .where({
            accountId: account.id,
          })
          .resultSize();
        expect(purchases).toBe(1);
      });

      it("create a purchase when no purchase found", async () => {
        await handleStripeEvent({
          data: { object: payload },
          type: "customer.subscription.updated",
        });

        const activePurchase = (await account.getActivePurchase()) as Purchase;
        expect(activePurchase).toBeDefined();
        expect(activePurchase).toMatchObject({
          accountId: account.id,
          planId: newPlan.id,
          source: "stripe",
          startDate: new Date("2022-12-26T14:22:11.000Z"),
        });
      });

      describe("when plan is updated", () => {
        beforeEach(async () => {
          [oldPurchase, pendingPurchase] = (await factory.createMany<Purchase>(
            "Purchase",
            [
              {
                accountId: account.id,
                planId: oldPlan.id,
                source: "stripe",
                startDate: previousMonth.toISOString(),
              },
              {
                accountId: account.id,
                planId: oldPlan.id,
                source: "stripe",
                startDate: nextMonth.toISOString(),
              },
            ]
          )) as [Purchase, Purchase];

          await handleStripeEvent({
            data: { object: payload },
            type: "customer.subscription.updated",
          });
        });

        it("end old purchase", async () => {
          const updatedOldPurchase = (await Purchase.query().findById(
            oldPurchase.id
          )) as Purchase;
          expect(updatedOldPurchase.endDate).not.toBeNull();
        });

        it("add end date to pending purchase", async () => {
          const updatedPendingPurchase = await pendingPurchase.$query();
          expect(updatedPendingPurchase.endDate).not.toBeNull();
        });

        it("create a new purchase", async () => {
          const purchases = await Purchase.query()
            .where({ accountId: account.id })
            .orderBy("startDate");

          const activePurchase = await account.getActivePurchase();

          expect(purchases).toHaveLength(3);
          expect(activePurchase).toMatchObject({
            planId: newPlan.id,
            accountId: account.id,
            source: "stripe",
            endDate: null,
          });
        });
      });
    });

    describe("customer.subscription.deleted", () => {
      const payload = SUBSCRIPTION_CANCEL_PAYLOAD;
      const stripeCustomerId = payload.customer;
      const stripePlanId = payload.items.data[0]!.price.product;
      let account: Account;
      let payloadPlan: Plan;
      let pendingPlan: Plan;
      let pendingPurchase: Purchase;

      beforeEach(async () => {
        [account, [payloadPlan, pendingPlan]] = (await Promise.all([
          factory.create<Account>("TeamAccount", { stripeCustomerId }),
          factory.createMany<Plan>("Plan", [{ stripePlanId }, {}]),
        ])) as [Account, [Plan, Plan]];

        await factory.create<Purchase>("Purchase", {
          accountId: account.id,
          planId: payloadPlan.id,
          source: "stripe",
          startDate: startOfPreviousMonth.toISOString(),
        });

        pendingPurchase = (await factory.create<Purchase>("Purchase", {
          accountId: account.id,
          planId: pendingPlan.id,
          source: "stripe",
          startDate: nextMonth.toISOString(),
        })) as Purchase;

        await handleStripeEvent({
          data: { object: payload },
          type: "customer.subscription.deleted",
        });
      });

      it("fill active purchase's end date", async () => {
        const activePurchase = await account.getActivePurchase();
        expect(activePurchase).toBeDefined();
        expect(activePurchase!.endDate).not.toBeNull();
      });

      it("fill pending purchase end date", async () => {
        const purchase = await pendingPurchase.$query();
        expect(purchase.endDate).not.toBeNull();
      });
    });
  });

  describe("#updateStripeUsage", () => {
    describe("without stripe customer Id", () => {
      it("should not update stripe usage", async () => {
        const account = await factory.create<Account>("UserAccount");
        const updatedUsage = await updateStripeUsage({
          account,
          totalScreenshots: 10,
        });
        expect(updatedUsage).toBeNull();
      });
    });

    describe("with stripe subscription", () => {
      let previousUsage: number;
      let customerId: string;
      let account: Account;

      beforeEach(async () => {
        const customerList = await stripe.customers.list({ limit: 2 });
        if (customerList.data.length < 2) {
          throw new Error("No customer found");
        }

        customerId = customerList.data[1]!.id;
        account = await factory.create<Account>("UserAccount", {
          stripeCustomerId: customerId,
        });
        const subscription = await getOrCreateSubscription(
          customerId,
          "price_1MyDKkHOD9RpIFZdIwgiX0I2"
        );
        const usageRecordSummaries =
          await stripe.subscriptionItems.listUsageRecordSummaries(
            subscription.items.data[0]!.id,
            { limit: 1 }
          );
        previousUsage = usageRecordSummaries.data[0]?.total_usage || 0;
      });

      it("should update stripe usage", async () => {
        const newUsage = previousUsage + 1;
        const updatedUsage = await updateStripeUsage({
          account,
          totalScreenshots: newUsage,
        });
        expect(updatedUsage).toBe(newUsage);
      });
    });
  });
});
