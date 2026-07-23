import { test as base, describe, expect } from "vitest";

import type { ScreenshotBucket } from ".";
import { factory, setupDatabase } from "../testing";
import { Account, checkIsActiveSubscriptionStatus } from "./Account";
import { Plan } from "./Plan";

type Fixtures = {
  fixture: {
    plans: Plan[];
    account: Account;
    vipAccount: Account;
    bucket1: ScreenshotBucket;
    bucket2: ScreenshotBucket;
    bucketOtherOrga: ScreenshotBucket;
  };
};

const it = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const [teams, plans] = await Promise.all([
      factory.Team.createMany(2),
      factory.Plan.createMany(3, [
        { name: "free", includedScreenshots: -1 },
        { name: "standard", includedScreenshots: 10 },
        { name: "pro", includedScreenshots: 100 },
      ]),
    ]);
    const [account, vipAccount] = await factory.TeamAccount.createMany(2, [
      { teamId: teams[0]!.id },
      { teamId: teams[1]!.id, forcedPlanId: plans[2]!.id },
    ]);
    const projects = await factory.Project.createMany(4, [
      { accountId: account!.id, private: true },
      { accountId: account!.id, private: true },
      { accountId: account!.id, private: false },
      { accountId: vipAccount!.id, private: true },
    ]);
    const buckets = await factory.ScreenshotBucket.createMany(4, [
      { projectId: projects[0]!.id },
      { projectId: projects[1]!.id },
      { projectId: projects[2]!.id },
      { projectId: projects[3]!.id },
    ]);
    await use({
      plans,
      account: account!,
      vipAccount: vipAccount!,
      bucket1: buckets[0]!,
      bucket2: buckets[1]!,
      bucketOtherOrga: buckets[3]!,
    });
  },
});

describe("Account", () => {
  describe("#getActiveSubscription", () => {
    it("returns null when no subscription found", async ({ fixture }) => {
      const manager = fixture.account.$getSubscriptionManager();
      const subscription = await manager.getActiveSubscription();
      expect(subscription).toBeNull();
    });

    it("returns null when only old subscription found", async ({ fixture }) => {
      await factory.Subscription.create({
        planId: fixture.plans[1]!.id,
        accountId: fixture.account.id,
        endDate: new Date(2010, 1, 1).toISOString(),
      });
      const manager = fixture.account.$getSubscriptionManager();
      const subscription = await manager.getActiveSubscription();
      expect(subscription).toBeNull();
    });

    it("returns active subscription", async ({ fixture }) => {
      await factory.Subscription.create({
        planId: fixture.plans[1]!.id,
        accountId: fixture.account.id,
      });
      const manager = fixture.account.$getSubscriptionManager();
      const plan = await manager.getPlan();
      expect(plan?.id).toBe(fixture.plans[1]!.id);
    });
  });

  describe("#getCurrentPeriodStartDate", () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    describe("without subscription", () => {
      it("returns first day of month", async ({ fixture }) => {
        const manager = fixture.account.$getSubscriptionManager();
        const startDate = await manager.getCurrentPeriodStartDate();
        expect(startDate).toEqual(startOfMonth);
      });
    });

    describe("with subscription", () => {
      it("returns subscription start date", async ({ fixture }) => {
        const subscriptionDay = 10;
        await factory.Subscription.create({
          planId: fixture.plans[1]!.id,
          accountId: fixture.account.id,
          startDate: new Date(2018, 3, subscriptionDay).toISOString(),
        });
        const manager = fixture.account.$getSubscriptionManager();
        const startDate = await manager.getCurrentPeriodStartDate();
        expect(startDate.getDate()).toEqual(subscriptionDay);
        if (now.getDate() >= subscriptionDay) {
          expect(startDate.getMonth()).toEqual(now.getMonth());
          expect(startDate.getFullYear()).toEqual(now.getFullYear());
        } else if (now.getMonth() === 0) {
          expect(startDate.getMonth()).toEqual(11);
          expect(startDate.getFullYear()).toEqual(now.getFullYear() - 1);
        } else {
          expect(startDate.getMonth()).toEqual(now.getMonth() - 1);
          expect(startDate.getFullYear()).toEqual(now.getFullYear());
        }
      });
    });
  });

  describe("#getCurrentPeriodScreenshots", () => {
    it("counts screenshots used this month", async ({ fixture }) => {
      await fixture.bucket1.$query().patch({
        complete: true,
        screenshotCount: 10,
        storybookScreenshotCount: 4,
      });
      const manager = fixture.account.$getSubscriptionManager();
      const consumption = await manager.getCurrentPeriodScreenshots();
      expect(consumption.all).toBe(10);
      expect(consumption.storybook).toBe(4);
    });

    it("counts screenshots used on other account's repository", async ({
      fixture,
    }) => {
      await fixture.bucket2.$query().patch({
        complete: true,
        screenshotCount: 10,
        storybookScreenshotCount: 4,
      });
      const manager = fixture.account.$getSubscriptionManager();
      const consumption = await manager.getCurrentPeriodScreenshots();
      expect(consumption.all).toBe(10);
      expect(consumption.storybook).toBe(4);
    });

    it("ignores old screenshots", async ({ fixture }) => {
      await fixture.bucket2.$query().patch({
        createdAt: new Date(2012, 1, 1).toISOString(),
        complete: true,
        screenshotCount: 10,
        storybookScreenshotCount: 4,
      });
      const manager = fixture.account.$getSubscriptionManager();
      const consumption = await manager.getCurrentPeriodScreenshots();
      expect(consumption.all).toBe(0);
      expect(consumption.storybook).toBe(0);
    });

    it("ignores screenshots of other account", async ({ fixture }) => {
      await fixture.bucketOtherOrga.$query().patch({
        complete: true,
        screenshotCount: 10,
        storybookScreenshotCount: 4,
      });
      const manager = fixture.account.$getSubscriptionManager();
      const consumption = await manager.getCurrentPeriodScreenshots();
      expect(consumption.all).toBe(0);
      expect(consumption.storybook).toBe(0);
    });
  });

  describe("#checkIsOutOfCapacity", () => {
    async function createUsageBasedTrial(props: {
      accountId: string;
      paymentMethodFilled: boolean;
    }) {
      const plan = await factory.Plan.create({
        usageBased: true,
        includedScreenshots: 10,
      });
      return factory.Subscription.create({
        planId: plan.id,
        accountId: props.accountId,
        status: "trialing",
        paymentMethodFilled: props.paymentMethodFilled,
      });
    }

    it("returns null when the trial stays within the included screenshots", async ({
      fixture,
    }) => {
      await createUsageBasedTrial({
        accountId: fixture.account.id,
        paymentMethodFilled: true,
      });
      await fixture.bucket1.$query().patch({
        complete: true,
        screenshotCount: 10,
      });
      const manager = fixture.account.$getSubscriptionManager();
      await expect(manager.checkIsOutOfCapacity()).resolves.toBeNull();
    });

    // Stripe never bills the usage consumed during a trial period, so a filled
    // payment method must not unlock it on its own.
    it("returns trialing when the trial goes over capacity with a payment method", async ({
      fixture,
    }) => {
      await createUsageBasedTrial({
        accountId: fixture.account.id,
        paymentMethodFilled: true,
      });
      await fixture.bucket1.$query().patch({
        complete: true,
        screenshotCount: 11,
      });
      const manager = fixture.account.$getSubscriptionManager();
      await expect(manager.checkIsOutOfCapacity()).resolves.toBe("trialing");
    });

    it("returns trialing when the trial goes over capacity without a payment method", async ({
      fixture,
    }) => {
      await createUsageBasedTrial({
        accountId: fixture.account.id,
        paymentMethodFilled: false,
      });
      await fixture.bucket1.$query().patch({
        complete: true,
        screenshotCount: 11,
      });
      const manager = fixture.account.$getSubscriptionManager();
      await expect(manager.checkIsOutOfCapacity()).resolves.toBe("trialing");
    });

    it("returns null when an active usage based plan goes over capacity", async ({
      fixture,
    }) => {
      const plan = await factory.Plan.create({
        usageBased: true,
        includedScreenshots: 10,
      });
      await factory.Subscription.create({
        planId: plan.id,
        accountId: fixture.account.id,
        status: "active",
      });
      await fixture.bucket1.$query().patch({
        complete: true,
        screenshotCount: 100,
      });
      const manager = fixture.account.$getSubscriptionManager();
      await expect(manager.checkIsOutOfCapacity()).resolves.toBeNull();
    });

    it("returns flat-rate when a flat rate plan goes over capacity", async ({
      fixture,
    }) => {
      await factory.Subscription.create({
        planId: fixture.plans[1]!.id,
        accountId: fixture.account.id,
      });
      await fixture.bucket1.$query().patch({
        complete: true,
        screenshotCount: 12,
      });
      const manager = fixture.account.$getSubscriptionManager();
      await expect(manager.checkIsOutOfCapacity()).resolves.toBe("flat-rate");
    });
  });

  describe("#getPlan", () => {
    describe("with subscription", () => {
      it("returns subscription plan", async ({ fixture }) => {
        await factory.Subscription.create({
          planId: fixture.plans[1]!.id,
          accountId: fixture.account.id,
        });
        const manager = fixture.account.$getSubscriptionManager();
        const plan = await manager.getPlan();
        expect(plan?.id).toBe(fixture.plans[1]!.id);
      });

      it("with forced plan returns forced plan", async ({ fixture }) => {
        await factory.Subscription.create({
          planId: fixture.plans[1]!.id,
          accountId: fixture.vipAccount.id,
        });
        const manager = fixture.vipAccount.$getSubscriptionManager();
        const plan = await manager.getPlan();
        expect(plan?.id).toBe(fixture.plans[2]!.id);
      });
    });

    describe("without subscription", () => {
      it("without plan it returns null", async ({ fixture }) => {
        const manager = fixture.account.$getSubscriptionManager();
        const plan = await manager.getPlan();
        expect(plan).toBe(null);
      });

      it("with forced plan returns forced plan", async ({ fixture }) => {
        const manager = fixture.vipAccount.$getSubscriptionManager();
        const plan = await manager.getPlan();
        expect(plan!.id).toBe(fixture.plans[2]!.id);
      });

      it("without free plan in database returns null", async ({ fixture }) => {
        await Account.query().patch({ forcedPlanId: null });
        await Plan.query().delete();
        const manager = fixture.vipAccount.$getSubscriptionManager();
        const plan = await manager.getPlan();
        expect(plan).toBeNull();
      });
    });
  });

  describe("#getSubscriptionStatus", () => {
    it("returns active for forced plans", async ({ fixture }) => {
      const manager = fixture.vipAccount.$getSubscriptionManager();
      const status = await manager.getSubscriptionStatus();
      expect(status).toBe("active");
    });

    it("returns null for user accounts", async () => {
      const userAccount = await factory.UserAccount.create();
      const manager = userAccount.$getSubscriptionManager();
      const status = await manager.getSubscriptionStatus();
      expect(status).toBeNull();
    });

    it("returns trialing_with_payment_method for a carded trial", async ({
      fixture,
    }) => {
      await factory.Subscription.create({
        planId: fixture.plans[1]!.id,
        accountId: fixture.account.id,
        status: "trialing",
        paymentMethodFilled: true,
      });
      const manager = fixture.account.$getSubscriptionManager();
      // The card unlocks access, it does not end the trial.
      const status = await manager.getSubscriptionStatus();
      expect(status).toBe("trialing_with_payment_method");
    });

    it("returns trialing for a trial without a payment method", async ({
      fixture,
    }) => {
      await factory.Subscription.create({
        planId: fixture.plans[1]!.id,
        accountId: fixture.account.id,
        status: "trialing",
        paymentMethodFilled: false,
      });
      const manager = fixture.account.$getSubscriptionManager();
      const status = await manager.getSubscriptionStatus();
      expect(status).toBe("trialing");
    });

    it("returns trial_expired when previous paid trial ended", async ({
      fixture,
    }) => {
      await factory.Subscription.create({
        planId: fixture.plans[1]!.id,
        accountId: fixture.account.id,
        status: "canceled",
        trialEndDate: new Date(2010, 0, 1).toISOString(),
        endDate: null,
      });
      const manager = fixture.account.$getSubscriptionManager();
      const status = await manager.getSubscriptionStatus();
      expect(status).toBe("trial_expired");
    });

    it("returns past_due for previous paid subscription in past_due", async ({
      fixture,
    }) => {
      await Promise.all([
        factory.Subscription.create({
          planId: fixture.plans[1]!.id,
          accountId: fixture.account.id,
          status: "past_due",
          startDate: new Date(2010, 0, 1).toISOString(),
          endDate: new Date(2010, 0, 2).toISOString(),
        }),
        factory.Subscription.create({
          planId: fixture.plans[1]!.id,
          accountId: fixture.account.id,
          status: "unpaid",
          startDate: new Date(2011, 0, 1).toISOString(),
          endDate: null,
        }),
      ]);
      const manager = fixture.account.$getSubscriptionManager();
      const status = await manager.getSubscriptionStatus();
      expect(status).toBe("unpaid");
    });

    it("returns canceled when no qualifying subscription exists", async ({
      fixture,
    }) => {
      const manager = fixture.account.$getSubscriptionManager();
      const status = await manager.getSubscriptionStatus();
      expect(status).toBe("canceled");
    });
  });

  describe("checkIsActiveSubscriptionStatus", () => {
    it("accepts the statuses that unlock team features", () => {
      expect(checkIsActiveSubscriptionStatus("active")).toBe(true);
      expect(
        checkIsActiveSubscriptionStatus("trialing_with_payment_method"),
      ).toBe(true);
    });

    it("rejects a trial with no payment method, and every other status", () => {
      expect(checkIsActiveSubscriptionStatus("trialing")).toBe(false);
      expect(checkIsActiveSubscriptionStatus("past_due")).toBe(false);
      expect(checkIsActiveSubscriptionStatus("unpaid")).toBe(false);
      expect(checkIsActiveSubscriptionStatus("canceled")).toBe(false);
      expect(checkIsActiveSubscriptionStatus("trial_expired")).toBe(false);
      expect(checkIsActiveSubscriptionStatus(null)).toBe(false);
    });
  });

  describe("#getSubscriptionStatuses", () => {
    it("returns statuses for multiple accounts in one call", async ({
      fixture,
    }) => {
      const [
        userAccount,
        trialingAccount,
        pastDueAccount,
        trialExpiredAccount,
      ] = await Promise.all([
        factory.UserAccount.create(),
        factory.TeamAccount.create(),
        factory.TeamAccount.create(),
        factory.TeamAccount.create(),
      ]);

      await Promise.all([
        factory.Subscription.create({
          planId: fixture.plans[1]!.id,
          accountId: trialingAccount.id,
          status: "trialing",
          paymentMethodFilled: true,
        }),
        factory.Subscription.create({
          planId: fixture.plans[1]!.id,
          accountId: pastDueAccount.id,
          status: "past_due",
        }),
        factory.Subscription.create({
          planId: fixture.plans[1]!.id,
          accountId: trialExpiredAccount.id,
          status: "canceled",
          trialEndDate: new Date(2010, 0, 1).toISOString(),
          endDate: null,
        }),
      ]);

      const statuses = await Account.getSubscriptionStatuses([
        fixture.vipAccount,
        userAccount,
        trialingAccount,
        pastDueAccount,
        trialExpiredAccount,
        fixture.account,
      ]);

      expect(statuses.get(fixture.vipAccount.id)).toBe("active");
      expect(statuses.get(userAccount.id)).toBeNull();
      expect(statuses.get(trialingAccount.id)).toBe(
        "trialing_with_payment_method",
      );
      expect(statuses.get(pastDueAccount.id)).toBe("past_due");
      expect(statuses.get(trialExpiredAccount.id)).toBe("trial_expired");
      expect(statuses.get(fixture.account.id)).toBe("canceled");
    });
  });
});
