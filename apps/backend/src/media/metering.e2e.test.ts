import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Plan, Project } from "@/database/models";
import { getAccountPeriodUsages } from "@/database/services/period-usage";
import { factory, setupDatabase } from "@/database/testing";

/**
 * Standalone media is billed on the **screenshot** meter, not on a meter of its
 * own. That is a deliberate pricing decision, and it only holds if every path
 * that counts screenshots counts media too — the per-account one that gates a
 * single upload, and the batched one that prices an invoice. They are two
 * separate queries, so they are both covered here: a media that shows up in one
 * and not the other is a billing bug nothing else would catch.
 */
describe("media metering", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const beforePeriod = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  let account: Account;
  let project: Project;
  let usageBasedPlan: Plan;

  beforeEach(async () => {
    usageBasedPlan = await factory.Plan.create({
      usageBased: true,
      interval: "month",
    });
    account = await factory.TeamAccount.create();
    project = await factory.Project.create({ accountId: account.id });
  });

  async function createSubscription() {
    const user = await factory.User.create();
    return factory.Subscription.create({
      accountId: account.id,
      planId: usageBasedPlan.id,
      includedScreenshots: 100,
      currency: "usd",
      additionalScreenshotPrice: 0.004,
      provider: "stripe",
      stripeSubscriptionId: "sub_media_metering",
      subscriberId: user.id,
      startDate: new Date("2021-01-01").toISOString(),
      status: "active",
    });
  }

  describe("$getScreenshotCountBetween", () => {
    it("adds media units to the screenshot total", async () => {
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        screenshotCount: 10,
        createdAt: periodStart.toISOString(),
      });
      // One image (1 unit) and one video (25 units).
      await factory.Media.create({
        accountId: account.id,
        billedUnits: 1,
        uploadedAt: periodStart.toISOString(),
      });
      await factory.Media.create({
        accountId: account.id,
        mimeType: "video/mp4",
        billedUnits: 25,
        uploadedAt: periodStart.toISOString(),
      });

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      expect(count.all).toBe(36);
      // Media is never Storybook, so it only lifts the neutral half.
      expect(count.neutral).toBe(36);
      expect(count.storybook).toBe(0);
    });

    it("ignores media whose upload never completed", async () => {
      // The two-step upload creates the row before the bytes land. Billing one
      // would charge for a file that does not exist.
      await factory.Media.create({
        accountId: account.id,
        billedUnits: 0,
        uploadedAt: null,
      });

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      expect(count.all).toBe(0);
    });

    it("ignores media uploaded before the period started", async () => {
      await factory.Media.create({
        accountId: account.id,
        billedUnits: 25,
        uploadedAt: beforePeriod.toISOString(),
      });

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      expect(count.all).toBe(0);
    });

    it("ignores another account's media", async () => {
      const otherAccount = await factory.TeamAccount.create();
      await factory.Media.create({
        accountId: otherAccount.id,
        billedUnits: 25,
        uploadedAt: periodStart.toISOString(),
      });

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      expect(count.all).toBe(0);
    });

    it("counts only a project's own media when scoped to a project", async () => {
      // Media belongs to the account, so a project-scoped breakdown can only
      // honestly report what was uploaded with that project's token.
      await factory.Media.create({
        accountId: account.id,
        projectId: project.id,
        billedUnits: 25,
        uploadedAt: periodStart.toISOString(),
      });
      await factory.Media.create({
        accountId: account.id,
        projectId: null,
        billedUnits: 1,
        uploadedAt: periodStart.toISOString(),
      });

      const scoped = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
        { projectId: project.id },
      );
      const total = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      expect(scoped.all).toBe(25);
      expect(total.all).toBe(26);
    });
  });

  describe("getAccountPeriodUsages", () => {
    it("prices media overage on the same line as screenshots", async () => {
      await createSubscription();
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        screenshotCount: 100, // exactly the included quota
        createdAt: periodStart.toISOString(),
      });
      // A video on top of a full quota: 25 units of overage.
      await factory.Media.create({
        accountId: account.id,
        mimeType: "video/mp4",
        billedUnits: 25,
        uploadedAt: periodStart.toISOString(),
      });

      const usages = await getAccountPeriodUsages([account]);
      const usage = usages.get(account.id);

      expect(usage?.additionalScreenshotCost).toBeCloseTo(25 * 0.004, 5);
    });

    it("does not multiply media by the number of projects", async () => {
      // Media hangs off the account, not off a project, so it cannot ride the
      // project join the bucket totals use — it is aggregated separately for
      // exactly this reason.
      await createSubscription();
      await factory.Project.create({ accountId: account.id, name: "second" });
      await factory.Project.create({ accountId: account.id, name: "third" });
      await factory.Media.create({
        accountId: account.id,
        mimeType: "video/mp4",
        billedUnits: 25,
        uploadedAt: periodStart.toISOString(),
      });

      const usages = await getAccountPeriodUsages([account]);
      const usage = usages.get(account.id);

      // 25 units, under the 100 included: no overage, and crucially not 75.
      expect(usage?.additionalScreenshotCost).toBe(0);

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );
      expect(count.all).toBe(25);
    });
  });
});
