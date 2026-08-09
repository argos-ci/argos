import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Plan, Project } from "@/database/models";
import { getAccountPeriodUsages } from "@/database/services/period-usage";
import { factory, setupDatabase } from "@/database/testing";

/**
 * A media with one uploaded version, which is the shape the meter reads.
 *
 * Units live on the version because every version is an upload that stores its
 * own bytes, so a fixture that only creates the identity charges nothing.
 */
async function createBilledMedia(attributes: {
  projectId: string;
  mimeType?: string;
  billedUnits: number;
  uploadedAt: string | null;
}) {
  const media = await factory.Media.create({ projectId: attributes.projectId });
  return factory.MediaVersion.create({
    mediaId: media.id,
    number: 1,
    mimeType: attributes.mimeType ?? "image/png",
    billedUnits: attributes.billedUnits,
    uploadedAt: attributes.uploadedAt,
  });
}

/**
 * Standalone media is billed on the **screenshot** meter, not on a meter of its
 * own. That is a deliberate pricing decision, and it only holds if every path
 * that counts screenshots counts media too — the per-account one that gates a
 * single upload, and the batched one that prices an invoice. They are two
 * separate queries, so both are covered here: a media that shows up in one and
 * not the other is a billing bug nothing else would catch.
 *
 * Media reaches the account through its project, exactly as a screenshot bucket
 * does, which is what makes a project transfer carry its billing with it.
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
      await createBilledMedia({
        projectId: project.id,
        billedUnits: 1,
        uploadedAt: periodStart.toISOString(),
      });
      await createBilledMedia({
        projectId: project.id,
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
      // And it is reported apart from the screenshots it was added to, because
      // "36 screenshots" is unreadable otherwise: 26 of them are two files.
      expect(count.media).toEqual({ count: 2, units: 26 });
    });

    it("counts every version as an upload", async () => {
      // A media's identity is its name, but each version stores its own bytes and
      // is billed on its own — so the count the billing page shows has to be
      // uploads, not media.
      const { media } = await factory.createMediaWithVersion({
        media: { projectId: project.id },
        version: {
          number: 1,
          billedUnits: 1,
          uploadedAt: periodStart.toISOString(),
        },
      });
      await factory.MediaVersion.create({
        mediaId: media.id,
        number: 2,
        billedUnits: 1,
        uploadedAt: periodStart.toISOString(),
      });

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      expect(count.media).toEqual({ count: 2, units: 2 });
    });

    it("reports no media usage when there is none", async () => {
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        screenshotCount: 10,
        createdAt: periodStart.toISOString(),
      });

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      expect(count.all).toBe(10);
      expect(count.media).toEqual({ count: 0, units: 0 });
    });

    it("ignores media whose upload never completed", async () => {
      // The two-step upload creates the row before the bytes land. Billing one
      // would charge for a file that does not exist.
      await createBilledMedia({
        projectId: project.id,
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
      await createBilledMedia({
        projectId: project.id,
        billedUnits: 25,
        uploadedAt: beforePeriod.toISOString(),
      });

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      expect(count.all).toBe(0);
    });

    it("ignores media in another account's project", async () => {
      // The meter joins through the project, so this is what proves the join
      // actually constrains the account.
      const otherAccount = await factory.TeamAccount.create();
      const otherProject = await factory.Project.create({
        accountId: otherAccount.id,
      });
      await createBilledMedia({
        projectId: otherProject.id,
        billedUnits: 25,
        uploadedAt: periodStart.toISOString(),
      });

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      expect(count.all).toBe(0);
    });

    it("counts only one project's media when scoped to a project", async () => {
      await createBilledMedia({
        projectId: project.id,
        billedUnits: 25,
        uploadedAt: periodStart.toISOString(),
      });
      const secondProject = await factory.Project.create({
        accountId: account.id,
        name: "second-project",
      });
      await createBilledMedia({
        projectId: secondProject.id,
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
      await createBilledMedia({
        projectId: project.id,
        mimeType: "video/mp4",
        billedUnits: 25,
        uploadedAt: periodStart.toISOString(),
      });

      const usages = await getAccountPeriodUsages([account]);

      expect(usages.get(account.id)?.additionalScreenshotCost).toBeCloseTo(
        25 * 0.004,
        5,
      );
    });

    it("does not multiply media by the number of projects", async () => {
      // Media and buckets are two independent one-to-many tables hanging off a
      // project, so joining both in a single pass would multiply their rows
      // against each other. They are aggregated separately for exactly this
      // reason, and this is the test that catches it if that ever changes.
      await createSubscription();
      await factory.Project.create({ accountId: account.id, name: "second" });
      await factory.Project.create({ accountId: account.id, name: "third" });
      await createBilledMedia({
        projectId: project.id,
        mimeType: "video/mp4",
        billedUnits: 25,
        uploadedAt: periodStart.toISOString(),
      });

      const usages = await getAccountPeriodUsages([account]);

      // 25 units, under the 100 included: no overage, and crucially not 75.
      expect(usages.get(account.id)?.additionalScreenshotCost).toBe(0);

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );
      expect(count.all).toBe(25);
    });

    it("does not multiply buckets by the number of media either", async () => {
      // The mirror of the case above: several media on one project must not
      // inflate that project's bucket count.
      await createSubscription();
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        screenshotCount: 10,
        createdAt: periodStart.toISOString(),
      });
      for (const _ of [1, 2, 3]) {
        await createBilledMedia({
          projectId: project.id,
          billedUnits: 1,
          uploadedAt: periodStart.toISOString(),
        });
      }

      const count = await account.$getScreenshotCountBetween(
        periodStart,
        "now",
      );

      // 10 screenshots + 3 images, not 30 + 3.
      expect(count.all).toBe(13);
    });
  });
});
