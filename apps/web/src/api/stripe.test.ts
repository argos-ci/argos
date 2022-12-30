import {
  Account,
  Organization,
  Plan,
  Purchase,
  User,
} from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";

import {
  PAID_INVOICE_PAYLOAD,
  PAYMENT_FAILED_INVOICE_PAYLOAD,
  SESSION_PAYLOAD,
  SUBSCRIPTION_CANCEL_PAYLOAD,
  SUBSCRIPTION_UPDATE_PAYLOAD,
} from "../__fixtures__/stripe-payloads.js";
import { getEffectiveDate, handleStripeEvent } from "./stripe.js";

describe("stripe", () => {
  useDatabase();

  const now = new Date();
  const previousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate()
  );
  const nextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );

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
      const accountId = 9;
      const stripePlanId = "prod_MzEavomA8VeCvW";
      const purchaserId = "7";

      beforeEach(async () => {
        const [organization] = (await Promise.all([
          factory.create("Organization"),
          factory.create("Plan", { stripePlanId }),
          factory.create("User", { id: purchaserId }),
        ])) as [Organization, Plan, User];

        await factory.create("OrganizationAccount", {
          organizationId: organization.id,
          id: accountId,
        });
      });

      it("throws without customer", async () => {
        await expect(
          handleStripeEvent({
            data: {
              object: { ...payload, customer: null },
            },
            eventType: "checkout.session.completed",
          })
        ).rejects.toThrowError(
          'empty customer in sessionId "cs_test_a191ofb3wzFfrFeTXGppOREABnrPRq789OWQAcYTuHMs8tLrgzrVHeJklw"'
        );
      });

      it("throws without clientReferenceId", async () => {
        await expect(
          handleStripeEvent({
            data: {
              object: { ...payload, client_reference_id: null },
            },
            eventType: "checkout.session.completed",
          })
        ).rejects.toThrowError(
          'empty clientReferenceId in stripe sessionId "cs_test_a191ofb3wzFfrFeTXGppOREABnrPRq789OWQAcYTuHMs8tLrgzrVHeJklw"'
        );
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
              object: { ...payload, client_reference_id: clientReferenceId },
            },
            eventType: "checkout.session.completed",
          })
        ).rejects.toThrowError(
          `no account found for with accountId: "${accountId}"`
        );
      });

      it("should add stripeCustomerId to account", async () => {
        await handleStripeEvent({
          data: { object: payload },
          eventType: "checkout.session.completed",
        });

        const account = await Account.query().findById(accountId);
        expect(account!.stripeCustomerId).toBe(customerId);
      });
    });

    describe("invoice.paid", () => {
      const payload = PAID_INVOICE_PAYLOAD;
      const stripeCustomerId = payload.customer;
      const productId = payload.lines.data[0]!.price.product;
      let account: Account;
      let payloadPlan: Plan;

      beforeEach(async () => {
        [payloadPlan, account] = (await Promise.all([
          factory.create("Plan", { stripePlanId: productId }),
          factory.create("OrganizationAccount", { stripeCustomerId }),
        ])) as [Plan, Account];

        await factory.create("Purchase", {
          accountId: account.id,
          planId: payloadPlan.id,
          source: "stripe",
          endDate: nextMonth.toISOString(),
        });
      });

      it("throws without customer", async () => {
        await expect(
          handleStripeEvent({
            data: {
              object: { ...payload, customer: null },
            },
            eventType: "invoice.paid",
          })
        ).rejects.toThrowError(
          'empty customer in invoiceId "in_1MJ2CAHOD9RpIFZduH2xtn7k"'
        );
      });

      it("remove purchase end date", async () => {
        await handleStripeEvent({
          data: { object: payload },
          eventType: "invoice.paid",
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
        [account, plan] = (await Promise.all([
          factory.create("OrganizationAccount", { stripeCustomerId }),
          factory.create("Plan"),
        ])) as [Account, Plan];

        await factory.create("Purchase", {
          accountId: account.id,
          planId: plan.id,
          source: "stripe",
        });
      });

      it("throws when stripe customer is empty", async () => {
        await expect(
          handleStripeEvent({
            data: { object: { ...payload, customer: null } },
            eventType: "invoice.payment_failed",
          })
        ).rejects.toThrowError("empty customer in invoi");
      });

      it("throws when account not found", async () => {
        await expect(
          handleStripeEvent({
            data: { object: { ...payload, customer: "XXX001" } },
            eventType: "invoice.payment_failed",
          })
        ).rejects.toThrowError("no account found for stripe strip");
      });

      it("throws when purchase not found", async () => {
        await expect(
          handleStripeEvent({
            data: { object: { ...payload, customer: "XXX001" } },
            eventType: "invoice.payment_failed",
          })
        ).rejects.toThrowError(
          'no account found for stripe stripeCustomerId: "XXX001"'
        );
      });

      it("fill purchase's end date", async () => {
        const purchase = (await account.getActivePurchase()) as Purchase;
        expect(purchase.endDate).toBeNull();
        await handleStripeEvent({
          data: { object: payload },
          eventType: "invoice.payment_failed",
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
          factory.create("OrganizationAccount", { stripeCustomerId }),
          factory.createMany("Plan", [
            { stripePlanId: "XXX_01_XXX", screenshotsLimitPerMonth: 7000 },
            { stripePlanId, screenshotsLimitPerMonth: 40000 },
          ]),
        ])) as [Account, [Plan, Plan]];
      });

      it("deletion doesn't create purchase", async () => {
        await factory.create("Purchase", {
          accountId: account.id,
          planId: oldPlan.id,
          source: "stripe",
        });
        await handleStripeEvent({
          data: { object: { ...payload, cancel_at: "1234" } },
          eventType: "customer.subscription.updated",
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
          eventType: "customer.subscription.updated",
        });

        const activePurchase = (await account.getActivePurchase()) as Purchase;
        expect(activePurchase).toBeDefined();
        expect(activePurchase).toMatchObject({
          accountId: account.id,
          planId: newPlan.id,
          source: "stripe",
        });
      });

      describe("when plan is updated", () => {
        beforeEach(async () => {
          [oldPurchase, pendingPurchase] = (await factory.createMany(
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
            eventType: "customer.subscription.updated",
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
          factory.create("OrganizationAccount", { stripeCustomerId }),
          factory.createMany("Plan", [{ stripePlanId }, {}]),
        ])) as [Account, [Plan, Plan]];

        await factory.create("Purchase", {
          accountId: account.id,
          planId: payloadPlan.id,
          source: "stripe",
        });

        pendingPurchase = (await factory.create("Purchase", {
          accountId: account.id,
          planId: pendingPlan.id,
          source: "stripe",
          startDate: nextMonth.toISOString(),
        })) as Purchase;

        await handleStripeEvent({
          data: { object: payload },
          eventType: "customer.subscription.deleted",
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
});