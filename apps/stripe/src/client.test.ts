import { Account, Plan, Purchase, Team, User } from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";

import {
  PAID_INVOICE_PAYLOAD,
  PAYMENT_FAILED_INVOICE_PAYLOAD,
  SESSION_PAYLOAD,
  SUBSCRIPTION_CANCEL_PAYLOAD,
  SUBSCRIPTION_UPDATE_PAYLOAD,
  SUBSCRIPTION_UPDATE_PAYLOAD_ADD_PAYMENT_METHOD,
  SUBSCRIPTION_UPDATE_PAYLOAD_END_TRIAL,
} from "../__fixtures__/stripe-payloads.js";
import { handleStripeEvent, stripe, updateStripeUsage } from "./client.js";
import { getEffectiveDate, timestampToDate } from "./utils.js";

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
      const payload = SESSION_PAYLOAD;
      const customerId = payload.customer;
      const accountId = "9";
      const stripePlanId = "prod_Njgin72JdGT9Yu";
      const purchaserId = "7";
      let account: Account;
      let plan: Plan;
      let team: Team;

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
          data: { object: payload },
          type: "checkout.session.completed",
        });

        account = (await Account.query().findById(accountId)) as Account;
      });

      it("throws without customer", async () => {
        await expect(
          handleStripeEvent({
            data: { object: { ...payload, customer: null } },
            type: "checkout.session.completed",
          })
        ).rejects.toThrowError(/^empty customer in stripe session/);
      });

      it("throws without clientReferenceId", async () => {
        await expect(
          handleStripeEvent({
            data: { object: { ...payload, client_reference_id: null } },
            type: "checkout.session.completed",
          })
        ).rejects.toThrowError(/^empty clientReferenceId in stripe session/);
      });

      it("throws with unknown clientReferenceId", async () => {
        const accountId = "5555";
        const clientReferenceId = Account.encodeStripeClientReferenceId({
          accountId,
          purchaserId: "1234",
        });
        await expect(
          handleStripeEvent({
            data: {
              object: { ...payload, client_reference_id: clientReferenceId },
            },
            type: "checkout.session.completed",
          })
        ).rejects.toThrowError(`can't find account with id "${accountId}"`);
      });

      it("should add stripeCustomerId to account", async () => {
        expect(account.stripeCustomerId).not.toBeNull();
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
          trialEndDate: new Date("2023-05-15T11:13:12.000Z"),
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
          planId: newPlan.id,
          source: "stripe",
          startDate: startOfPreviousMonth.toISOString(),
        });
        await handleStripeEvent({
          data: { object: { ...payload, cancel_at: "1234" } },
          type: "customer.subscription.updated",
        });
        const purchases = await Purchase.query()
          .where({ accountId: account.id })
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

      describe("when user add payment method", () => {
        it("update purchase", async () => {
          oldPurchase = await factory.create<Purchase>("Purchase", {
            accountId: account.id,
            planId: newPlan.id,
            source: "stripe",
            startDate: startOfPreviousMonth.toISOString(),
            paymentMethodFilled: false,
          });
          await handleStripeEvent({
            data: { object: SUBSCRIPTION_UPDATE_PAYLOAD_ADD_PAYMENT_METHOD },
            type: "customer.subscription.updated",
          });
          const updatedPurchase = (await oldPurchase.$query()) as Purchase;
          expect(updatedPurchase.paymentMethodFilled).toBe(true);
        });
      });

      describe("when user select a new plan", () => {
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

      describe("when user end trial", () => {
        it("add trial end date", async () => {
          const payload = SUBSCRIPTION_UPDATE_PAYLOAD_END_TRIAL;
          const trialPurchase = await factory.create<Purchase>("Purchase", {
            accountId: account.id,
            planId: newPlan.id,
            source: "stripe",
            startDate: startOfPreviousMonth.toISOString(),
            endDate: null,
          });
          await handleStripeEvent({
            data: { object: SUBSCRIPTION_UPDATE_PAYLOAD_END_TRIAL },
            type: "customer.subscription.updated",
          });
          const updatedTrialPurchase =
            (await trialPurchase.$query()) as Purchase;
          expect(updatedTrialPurchase.endDate).toBeDefined();
          if (!updatedTrialPurchase.endDate) throw new Error("endDate is null");
          expect(new Date(updatedTrialPurchase.endDate).toISOString()).toBe(
            timestampToDate(payload.trial_end)
          );
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
      let account: Account;
      const customerId = "cus_NoUkz8LAOY8AOw";
      const subscriptionItemId = "si_NoUlN4sH4tuNGM";

      beforeEach(async () => {
        account = await factory.create<Account>("UserAccount", {
          stripeCustomerId: customerId,
        });
        const usageRecordSummaries =
          await stripe.subscriptionItems.listUsageRecordSummaries(
            subscriptionItemId,
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
