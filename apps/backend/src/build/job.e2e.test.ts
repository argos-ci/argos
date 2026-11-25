import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Build, Project, ScreenshotBucket } from "@/database/models";
import {
  BuildNotification,
  NotificationWorkflow,
  ScreenshotDiff,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { job, performBuild } from ".";

describe("build", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("performBuild", () => {
    let build: Build;
    let project: Project;
    let compareBucket: ScreenshotBucket;

    beforeEach(async () => {
      project = await factory.Project.create({
        githubRepositoryId: null,
      });
      compareBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
      });
      build = await factory.Build.create({
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: compareBucket.id,
        projectId: project.id,
        jobStatus: "progress",
        conclusion: null,
      });
      const file = await factory.File.create({
        type: "screenshot",
      });
      await factory.Screenshot.create({
        name: "b",
        screenshotBucketId: compareBucket.id,
        fileId: file.id,
      });
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        complete: true,
      });
    });

    it("works", async () => {
      await performBuild(build);
      const notifications = await BuildNotification.query()
        .where("buildId", build.id)
        .orderBy("createdAt", "asc");

      expect(notifications).toHaveLength(2);
      expect(notifications[0]).toHaveProperty("type", "progress");
      expect(notifications[1]).toHaveProperty("type", "diff-detected");

      const diffs = await ScreenshotDiff.query().where("buildId", build.id);
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toHaveProperty("jobStatus", "complete");
      expect(diffs[0]).toHaveProperty("score", null);
      expect(diffs[0]).toHaveProperty("s3Id", null);
    });
  });

  describe("performBuild on a Pro team", () => {
    it("offers Enterprise once the build brings the period to $1,500", async () => {
      const account = await factory.TeamAccount.create();
      invariant(account.teamId, "team account has no team");
      const owner = await factory.User.create();
      await factory.TeamUser.create({
        teamId: account.teamId,
        userId: owner.id,
        userLevel: "owner",
      });
      const plan = await factory.Plan.create({
        name: "pro",
        usageBased: true,
        interval: "month",
        includedScreenshots: 1000,
      });
      // Not a Stripe subscription, so the usage stays out of the Stripe API.
      await factory.Subscription.create({
        accountId: account.id,
        planId: plan.id,
        includedScreenshots: 1000,
        currency: "usd",
        flatPrice: 100,
        additionalScreenshotPrice: 0.5,
        createdAt: new Date("2021-01-01").toISOString(),
        startDate: new Date("2021-01-01").toISOString(),
      });
      const project = await factory.Project.create({
        accountId: account.id,
        githubRepositoryId: null,
      });
      // 2,800 screenshots past the quota at $0.50, plus the $100 plan.
      const bucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        screenshotCount: 3800,
      });
      const build = await factory.Build.create({
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: bucket.id,
        projectId: project.id,
        jobStatus: "progress",
        conclusion: null,
      });

      await performBuild(build);

      const offers = await NotificationWorkflow.query()
        .where("type", "enterprise_offer")
        .withGraphFetched("recipients");
      expect(offers).toHaveLength(1);
      expect(
        offers[0]?.recipients?.map((recipient) => recipient.userId),
      ).toEqual([owner.id]);
    });
  });

  describe("requeueStalled", () => {
    const now = new Date("2026-11-22T12:00:00.000Z");
    const minutesAgo = (minutes: number) =>
      new Date(now.getTime() - minutes * 60 * 1000).toISOString();

    function createPendingBuild(finalizedAt: string | null) {
      return factory.Build.create({
        jobStatus: "pending",
        conclusion: null,
        stats: null,
        createdAt: minutesAgo(3 * 24 * 60),
        finalizedAt,
      });
    }

    it("queues again the finalized builds no job picked up", async () => {
      const [stalled] = await Promise.all([
        createPendingBuild(minutesAgo(15)),
        // Still on its way through the queue.
        createPendingBuild(minutesAgo(2)),
        // Still uploading.
        createPendingBuild(null),
        // Left alone past a day.
        createPendingBuild(minutesAgo(2 * 24 * 60)),
        factory.Build.create({
          jobStatus: "progress",
          conclusion: null,
          stats: null,
          finalizedAt: minutesAgo(15),
        }),
      ]);
      const push = vi.spyOn(job, "push").mockResolvedValue();

      await job.requeueStalled(now);

      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith(stalled.id);
    });
  });
});
