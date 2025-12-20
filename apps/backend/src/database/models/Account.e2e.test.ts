import { test as base, describe, expect } from "vitest";

import type { ScreenshotBucket } from ".";
import { factory, setupDatabase } from "../testing";
import { Account } from "./Account";
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
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(startDate.getMonth()).toEqual(now.getMonth());
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(startDate.getFullYear()).toEqual(now.getFullYear());
        } else if (now.getMonth() === 0) {
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(startDate.getMonth()).toEqual(11);
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(startDate.getFullYear()).toEqual(now.getFullYear() - 1);
        } else {
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(startDate.getMonth()).toEqual(now.getMonth() - 1);
          // eslint-disable-next-line vitest/no-conditional-expect
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
});
