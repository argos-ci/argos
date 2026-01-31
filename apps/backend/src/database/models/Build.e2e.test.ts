import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import type { Account, User } from ".";
import { Build } from "./Build";

const baseData = {
  projectId: "1",
  baseScreenshotBucketId: "1",
  compareScreenshotBucketId: "2",
  jobStatus: "pending",
};

describe("models/Build", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("create build", () => {
    it("should add a build number", async () => {
      const build1 = await factory.Build.create();
      const build2 = await factory.Build.create({
        projectId: build1.projectId,
      });
      expect(build1.number).toBe(1);
      expect(build2.number).toBe(2);
    });

    it("should be able to override the number", async () => {
      const build = await factory.Build.create({
        number: 0,
      });
      expect(build.number).toBe(0);
    });
  });

  describe("patch build", () => {
    it("should not add a build number", async () => {
      const build = await factory.Build.create();
      expect(build.number).toBe(1);
      await build.$query().patch({ jobStatus: "complete" }).returning("*");
      await build.reload();
      expect(build.number).toBe(1);
      expect(build.jobStatus).toBe("complete");
    });
  });

  describe("validation screenshotBucket", () => {
    it("should throw if the screenshot buckets are the same", () => {
      expect(() => {
        Build.fromJson({
          ...baseData,
          compareScreenshotBucketId: "1",
        });
      }).toThrow(
        "The base screenshot bucket should be different to the compare one.",
      );
    });

    it("should not throw if the screenshot buckets are different", () => {
      expect(() => {
        Build.fromJson(baseData);
      }).not.toThrow();
    });
  });

  describe("#getUsers", () => {
    let user: User;
    let account: Account;
    let build: Build;

    beforeEach(async () => {
      user = await factory.User.create();
      account = await factory.UserAccount.create({
        userId: user.id,
      });
      const project = await factory.Project.create({
        accountId: account.id,
      });
      build = await factory.Build.create({
        projectId: project.id,
      });
    });

    it("should return users having rights on the repository", async () => {
      const users = await build.getUsers();
      expect(users.length === 1).toBe(true);
      expect(users[0]!.id).toBe(user.id);

      const staticUsers = await Build.getUsers(build.id);
      expect(staticUsers.length === 1).toBe(true);
      expect(staticUsers[0]!.id).toBe(user.id);
    });
  });

  describe("#getStatuses", () => {
    let build;

    const getBuildStatus = async (build: Build) => {
      const [status] = await Build.getStatuses([build]);
      return status;
    };

    describe("with in progress job", () => {
      it("should be pending", async () => {
        build = await factory.Build.create({ jobStatus: "progress" });
        expect(await getBuildStatus(build)).toBe("pending");
      });
    });

    describe("with pending job", () => {
      it("should be pending", async () => {
        build = await factory.Build.create({ jobStatus: "pending" });
        expect(await getBuildStatus(build)).toBe("pending");
      });
    });

    describe("with old in progress job", () => {
      it("should be expired", async () => {
        build = await factory.Build.create({
          jobStatus: "progress",
          createdAt: new Date(
            new Date().valueOf() - 3 * 3600 * 1000,
          ).toISOString(),
        });
        expect(await getBuildStatus(build)).toBe("expired");
      });
    });

    describe("with old pending job", () => {
      it("should be expired", async () => {
        build = await factory.Build.create({
          jobStatus: "pending",
          createdAt: new Date(
            new Date().valueOf() - 3 * 3600 * 1000,
          ).toISOString(),
        });
        expect(await getBuildStatus(build)).toBe("expired");
      });
    });

    describe("with complete job", () => {
      describe("and one in error screenshot diff", () => {
        it("should be error", async () => {
          build = await factory.Build.create({
            jobStatus: "complete",
            conclusion: null,
            stats: null,
          });
          await factory.ScreenshotDiff.createMany(2, [
            { buildId: build.id, jobStatus: "complete" },
            { buildId: build.id, jobStatus: "error" },
          ]);
          expect(await getBuildStatus(build)).toBe("error");
        });
      });

      describe("and one pending screenshot diff", () => {
        it("should be pending", async () => {
          build = await factory.Build.create({
            jobStatus: "complete",
            conclusion: null,
            stats: null,
          });
          await factory.ScreenshotDiff.createMany(2, [
            { buildId: build.id, jobStatus: "complete" },
            { buildId: build.id, jobStatus: "pending" },
          ]);
          expect(await getBuildStatus(build)).toBe("progress");
        });
      });

      describe("and one in progress screenshot diff", () => {
        it("should be progress", async () => {
          build = await factory.Build.create({
            jobStatus: "complete",
            conclusion: null,
            stats: null,
          });
          await factory.ScreenshotDiff.createMany(2, [
            { buildId: build.id, jobStatus: "complete" },
            { buildId: build.id, jobStatus: "progress" },
          ]);
          expect(await getBuildStatus(build)).toBe("progress");
        });
      });

      describe("with complete screenshot diffs", () => {
        it("should be error", async () => {
          build = await factory.Build.create({
            jobStatus: "complete",
            conclusion: null,
            stats: null,
          });
          await factory.ScreenshotDiff.createMany(2, [
            { buildId: build.id, jobStatus: "complete" },
            { buildId: build.id, jobStatus: "complete" },
          ]);
          expect(await getBuildStatus(build)).toBe("complete");
        });
      });
    });

    describe("with aborted job", () => {
      it("should be aborted", async () => {
        build = await factory.Build.create({ jobStatus: "aborted" });
        expect(await getBuildStatus(build)).toBe("aborted");
      });
    });

    describe("with error job", () => {
      it("should be error", async () => {
        build = await factory.Build.create({ jobStatus: "error" });
        expect(await getBuildStatus(build)).toBe("error");
      });
    });

    it("should return ordered build statuses", async () => {
      const builds = await factory.Build.createMany(5, [
        { jobStatus: "pending" },
        { jobStatus: "progress" },
        { jobStatus: "complete" },
        { jobStatus: "error" },
        { jobStatus: "aborted" },
      ]);
      const statuses = await Build.getStatuses(builds);
      expect(statuses).toEqual([
        "pending",
        "pending",
        "complete",
        "error",
        "aborted",
      ]);
    });
  });

  describe("#computeConclusion", () => {
    it("should return 'no-changes' when empty", async () => {
      const build = await factory.Build.create({
        jobStatus: "complete",
      });
      const conclusion = await Build.computeConclusion(build);
      expect(conclusion).toBe("no-changes");
    });

    it("should return 'no-changes' when no diff detected", async () => {
      const build = await factory.Build.create();
      await factory.ScreenshotDiff.createMany(2, [
        { buildId: build.id },
        { buildId: build.id },
      ]);
      const conclusion = await Build.computeConclusion(build);
      expect(conclusion).toBe("no-changes");
    });

    it("should return 'changes-detected' when diff are detected", async () => {
      const build = await factory.Build.create();
      await factory.ScreenshotDiff.createMany(2, [
        { buildId: build.id },
        { buildId: build.id, score: 0.8 },
      ]);
      const conclusion = await Build.computeConclusion(build);
      expect(conclusion).toBe("changes-detected");
    });

    it("should ignore diffs for nested screenshots", async () => {
      const build = await factory.Build.create({
        jobStatus: "complete",
        conclusion: null,
        stats: null,
      });
      const compareScreenshot = await factory.Screenshot.create({
        parentName: "Story",
        screenshotBucketId: build.compareScreenshotBucketId,
      });
      await factory.ScreenshotDiff.create({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: compareScreenshot.id,
      });
      const conclusion = await Build.computeConclusion(build);
      const [stats] = await Build.computeStats([build.id]);
      expect(conclusion).toBe("no-changes");
      expect(stats).toEqual({
        failure: 0,
        added: 0,
        unchanged: 0,
        changed: 0,
        removed: 0,
        total: 0,
        retryFailure: 0,
        ignored: 0,
      });
    });
  });

  describe("#reviewStatuses", () => {
    it("should return null for uncompleted jobs", async () => {
      const build = await factory.Build.create({
        conclusion: null,
      });
      const reviewStatuses = await Build.getReviewStatuses([build]);
      expect(reviewStatuses).toEqual([null]);
    });

    it("should return null for 'no-changes' builds", async () => {
      const builds = await factory.Build.createMany(2, {
        conclusion: "no-changes",
      });
      await factory.ScreenshotDiff.createMany(2, { buildId: builds[0]!.id });
      await factory.ScreenshotDiff.createMany(2, { buildId: builds[1]!.id });
      const reviewStatuses = await Build.getReviewStatuses(builds);
      expect(reviewStatuses).toEqual([null, null]);
    });

    it("should return 'accepted' when the last review is of type 'approved'", async () => {
      const build = await factory.Build.create({
        conclusion: "changes-detected",
      });
      await factory.BuildReview.create({
        buildId: build.id,
        state: "rejected",
      });
      await factory.BuildReview.create({
        buildId: build.id,
        state: "approved",
      });
      const reviewStatuses = await Build.getReviewStatuses([build]);
      expect(reviewStatuses).toEqual(["accepted"]);
    });

    it("should return 'rejected' when the last review is of type 'rejected'", async () => {
      const build = await factory.Build.create({
        conclusion: "changes-detected",
      });
      await factory.BuildReview.create({
        buildId: build.id,
        state: "approved",
      });
      await factory.BuildReview.create({
        buildId: build.id,
        state: "rejected",
      });
      const reviewStatuses = await Build.getReviewStatuses([build]);
      expect(reviewStatuses).toEqual(["rejected"]);
    });

    it("should return null in other case", async () => {
      const build = await factory.Build.create({
        conclusion: "changes-detected",
      });
      const reviewStatuses = await Build.getReviewStatuses([build]);
      expect(reviewStatuses).toEqual([null]);
    });
  });

  describe("#getUrl", () => {
    it("should return url", async () => {
      const build = await factory.Build.create();
      const url = await build.getUrl();
      const project = await build
        .$relatedQuery("project")
        .withGraphFetched("account");
      expect(url).toMatch(
        `http://localhost:3000/${project!.account!.slug}/${
          project!.name
        }/builds/${build.number}`,
      );
    });
  });
});
