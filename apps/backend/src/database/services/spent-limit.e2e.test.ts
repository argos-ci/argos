import { beforeEach, describe, expect, it } from "vitest";

import type {
  Account,
  Project,
  Subscription,
} from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { getSpendLimitThreshold } from "./spend-limit.js";

describe("spent limit", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("getSpendLimitThreshold", () => {
    const now = new Date();
    let account: Account;
    let project: Project;
    let subscription: Subscription;

    beforeEach(async () => {
      const plan = await factory.Plan.create({
        usageBased: true,
      });
      account = await factory.TeamAccount.create({
        meteredSpendLimitByPeriod: 500,
      });
      const user = await factory.User.create();
      subscription = await factory.Subscription.create({
        accountId: account.id,
        planId: plan.id,
        includedScreenshots: 1000,
        currency: "usd",
        additionalScreenshotPrice: 0.5,
        provider: "stripe",
        stripeSubscriptionId: "sub_123",
        subscriberId: user.id,
        startDate: new Date("2021-01-01").toISOString(),
        usageUpdatedAt: new Date(now.getTime() - 4000).toISOString(),
      });
      project = await factory.Project.create({
        accountId: account.id,
      });
      await factory.ScreenshotBucket.createMany(2, [
        {
          createdAt: new Date(now.getTime() - 5000).toISOString(),
          projectId: project.id,
          complete: true,
          screenshotCount: 1000,
        },
        {
          createdAt: new Date(now.getTime() - 3000).toISOString(),
          projectId: project.id,
          complete: true,
          screenshotCount: 502,
        },
      ]);
    });

    describe("without spend limit", () => {
      beforeEach(async () => {
        await account.$query().patchAndFetch({
          meteredSpendLimitByPeriod: null,
        });
      });

      it("returns null", async () => {
        const threshold = await getSpendLimitThreshold(account);
        expect(threshold).toBeNull();
      });
    });

    describe("with spend limit", () => {
      it("returns the correct threshold", async () => {
        const threshold = await getSpendLimitThreshold(account);
        expect(threshold).toBe(50);
      });
    });

    describe("with `usageUpdatedAt` null", () => {
      beforeEach(async () => {
        await subscription.$query().patchAndFetch({
          usageUpdatedAt: null,
        });
      });

      it("returns the correct threshold", async () => {
        const threshold = await getSpendLimitThreshold(account);
        expect(threshold).toBe(50);
      });
    });

    describe("with previous usage already above threshold", () => {
      beforeEach(async () => {
        await subscription.$query().patchAndFetch({
          usageUpdatedAt: new Date(now.getTime() - 2000).toISOString(),
        });
      });

      it("returns null", async () => {
        const threshold = await getSpendLimitThreshold(account);
        expect(threshold).toBeNull();
      });
    });

    describe("with two thresholds reached", () => {
      beforeEach(async () => {
        await factory.ScreenshotBucket.createMany(2, [
          {
            createdAt: new Date(now.getTime() - 3000).toISOString(),
            projectId: project.id,
            complete: true,
            screenshotCount: 10000,
          },
        ]);
      });

      it("returns the highest threshold reached", async () => {
        const threshold = await getSpendLimitThreshold(account);
        expect(threshold).toBe(100);
      });
    });
  });
});
