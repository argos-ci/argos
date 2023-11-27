import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "../testing/index.js";
import { Account } from "./Account.js";
import { Plan } from "./Plan.js";
import type { ScreenshotBucket } from "./index.js";

describe("Account", () => {
  let plans: Plan[];
  let account: Account, vipAccount: Account;
  let bucket1: ScreenshotBucket,
    bucket2: ScreenshotBucket,
    bucketOtherOrga: ScreenshotBucket;

  beforeEach(async () => {
    await setupDatabase();
    const [teams, localPlans] = await Promise.all([
      factory.Team.createMany(2),
      factory.Plan.createMany(3, [
        { name: "free", screenshotsLimitPerMonth: -1 },
        { name: "standard", screenshotsLimitPerMonth: 10 },
        { name: "pro", screenshotsLimitPerMonth: 100 },
      ]),
    ]);
    plans = localPlans;
    const accounts = await factory.TeamAccount.createMany(2, [
      { teamId: teams[0]!.id },
      { teamId: teams[1]!.id, forcedPlanId: plans[2]!.id },
    ]);
    account = accounts[0]!;
    vipAccount = accounts[1]!;
    const projects = await factory.Project.createMany(4, [
      { accountId: account.id, private: true },
      { accountId: account.id, private: true },
      { accountId: account.id, private: false },
      { accountId: vipAccount.id, private: true },
    ]);
    const buckets = await factory.ScreenshotBucket.createMany(4, [
      { projectId: projects[0]!.id },
      { projectId: projects[1]!.id },
      { projectId: projects[2]!.id },
      { projectId: projects[3]!.id },
    ]);
    bucket1 = buckets[0]!;
    bucket2 = buckets[1]!;
    bucketOtherOrga = buckets[3]!;
  });

  describe("#$getActivePurchase", () => {
    it("returns null when no purchase found", async () => {
      const subscription = account.$getSubscription();
      const activePurchase = await subscription.getActivePurchase();
      expect(activePurchase).toBeNull();
    });

    it("returns null when only old purchase found", async () => {
      await factory.Purchase.create({
        planId: plans[1]!.id,
        accountId: account.id,
        endDate: new Date(2010, 1, 1).toISOString(),
      });
      const subscription = account.$getSubscription();
      const activePurchase = await subscription.getActivePurchase();
      expect(activePurchase).toBeNull();
    });

    it("returns active purchase", async () => {
      await factory.Purchase.create({
        planId: plans[1]!.id,
        accountId: account.id,
      });
      const subscription = account.$getSubscription();
      const plan = await subscription.getPlan();
      expect(plan?.id).toBe(plans[1]!.id);
    });
  });

  describe("#getCurrentPeriodStartDate", () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    describe("without purchase", () => {
      it("returns first day of month", async () => {
        const subscription = account.$getSubscription();
        const startDate = await subscription.getCurrentPeriodStartDate();
        expect(startDate).toEqual(startOfMonth);
      });
    });

    describe("with purchase", () => {
      const subscriptionDay = 10;

      beforeEach(async () => {
        await factory.Purchase.create({
          planId: plans[1]!.id,
          accountId: account.id,
          startDate: new Date(2018, 3, subscriptionDay).toISOString(),
        });
      });

      it("returns purchase start date", async () => {
        const subscription = account.$getSubscription();
        const startDate = await subscription.getCurrentPeriodStartDate();
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
    it("count screenshots used this month", async () => {
      await bucket1.$query().patch({
        complete: true,
        screenshotCount: 10,
      });
      const subscription = account.$getSubscription();
      const consumption = await subscription.getCurrentPeriodScreenshots();
      expect(consumption).toBe(10);
    });

    it("count screenshots used on other account's repository", async () => {
      await bucket2.$query().patch({
        complete: true,
        screenshotCount: 10,
      });
      const subscription = account.$getSubscription();
      const consumption = await subscription.getCurrentPeriodScreenshots();
      expect(consumption).toBe(10);
    });

    it("ignore old screenshots", async () => {
      await bucket2.$query().patch({
        createdAt: new Date(2012, 1, 1).toISOString(),
        complete: true,
        screenshotCount: 10,
      });
      const subscription = account.$getSubscription();
      const consumption = await subscription.getCurrentPeriodScreenshots();
      expect(consumption).toBe(0);
    });

    it("ignore screenshots of other account", async () => {
      await bucketOtherOrga.$query().patch({
        complete: true,
        screenshotCount: 10,
      });
      const subscription = account.$getSubscription();
      const consumption = await subscription.getCurrentPeriodScreenshots();
      expect(consumption).toBe(0);
    });
  });

  describe("#getPlan", () => {
    describe("with purchase", () => {
      it("returns purchased plan", async () => {
        await factory.Purchase.create({
          planId: plans[1]!.id,
          accountId: account.id,
        });
        const subscription = account.$getSubscription();
        const plan = await subscription.getPlan();
        expect(plan?.id).toBe(plans[1]!.id);
      });

      it("with forced plan returns forced plan", async () => {
        await factory.Purchase.create({
          planId: plans[1]!.id,
          accountId: vipAccount.id,
        });

        const subscription = vipAccount.$getSubscription();
        const plan = await subscription.getPlan();
        expect(plan?.id).toBe(plans[2]!.id);
      });
    });

    describe("without purchase", () => {
      it("with free plan in database returns free plan", async () => {
        const subscription = account.$getSubscription();
        const plan = await subscription.getPlan();
        expect(plan!.id).toBe(plans[0]!.id);
      });

      it("with forced plan returns forced plan", async () => {
        const subscription = vipAccount.$getSubscription();
        const plan = await subscription.getPlan();
        expect(plan!.id).toBe(plans[2]!.id);
      });

      it("without free plan in database returns null", async () => {
        await Account.query().patch({ forcedPlanId: null });
        await Plan.query().delete();
        const subscription = vipAccount.$getSubscription();
        const plan = await subscription.getPlan();
        expect(plan).toBeNull();
      });
    });
  });
});
