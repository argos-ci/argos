import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import {
  BuildReview,
  ScreenshotDiff,
  type Build,
  type Project,
  type ScreenshotBucket,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { autoApproveBuild } from "./autoApproveBuild";

const test = it.extend<{
  project: Project;
  previousBuild: Build;
  build: Build;
  compareBucket: ScreenshotBucket;
}>({
  project: async ({}, use) => {
    const project = await factory.Project.create();
    await use(project);
  },
  previousBuild: async ({ project }, use) => {
    const previousBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "feature",
      name: "default",
    });
    const previousBuild = await factory.Build.create({
      compareScreenshotBucketId: previousBucket.id,
      conclusion: "changes-detected",
      projectId: project.id,
      createdAt: new Date(Date.now() - 1000).toISOString(),
    });
    await use(previousBuild);
  },
  build: async ({ project, previousBuild }, use) => {
    void previousBuild;
    const bucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "feature",
      name: "default",
    });
    const build = await factory.Build.create({
      compareScreenshotBucketId: bucket.id,
      conclusion: "changes-detected",
      jobStatus: "complete",
      projectId: project.id,
      createdAt: new Date().toISOString(),
    });
    await use(build);
  },
  compareBucket: async ({ build }, use) => {
    await build.$fetchGraph("compareScreenshotBucket");
    const compareBucket = build.compareScreenshotBucket;
    invariant(compareBucket);
    await use(compareBucket);
  },
});

/**
 * Create a diff on a build that is both reviewable ("added" status) and
 * matchable by fingerprint.
 */
async function createFingerprintedDiff(buildId: string, fingerprint: string) {
  const screenshot = await factory.Screenshot.create();
  return factory.ScreenshotDiff.create({
    buildId,
    compareScreenshotId: screenshot.id,
    baseScreenshotId: null,
    fingerprint,
  });
}

/**
 * Approve the given diffs of the previous build on behalf of a user, so their
 * approvals can be reapplied to the current build.
 */
async function approvePreviousDiffs(
  buildId: string,
  diffs: ScreenshotDiff[],
  userId: string,
) {
  const buildReview = await factory.BuildReview.create({
    buildId,
    state: "approved",
    userId,
  });
  await factory.ScreenshotDiffReview.createMany(
    diffs.length,
    diffs.map((diff) => ({
      buildReviewId: buildReview.id,
      screenshotDiffId: diff.id,
      state: "approved" as const,
    })),
  );
  return buildReview;
}

describe("autoApproveBuild", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("approves on behalf of a user whose previous approvals cover all changes", async ({
    previousBuild,
    build,
  }) => {
    const user = await factory.User.create();
    const previousDiff = await createFingerprintedDiff(
      previousBuild.id,
      "fp-1",
    );
    await approvePreviousDiffs(previousBuild.id, [previousDiff], user.id);
    const currentDiff = await createFingerprintedDiff(build.id, "fp-1");

    await autoApproveBuild({ build });

    const reviews = await BuildReview.query()
      .where("buildId", build.id)
      .withGraphFetched("screenshotDiffReviews");
    expect(reviews).toHaveLength(1);
    const review = reviews[0]!;
    expect(review.state).toBe("approved");
    expect(review.automatic).toBe(true);
    expect(review.userId).toBe(user.id);
    expect(review.screenshotDiffReviews).toHaveLength(1);
    expect(review.screenshotDiffReviews![0]!.screenshotDiffId).toBe(
      currentDiff.id,
    );
    expect(review.screenshotDiffReviews![0]!.state).toBe("approved");
  });

  test("does not approve when a change is not covered by previous approvals", async ({
    previousBuild,
    build,
  }) => {
    const user = await factory.User.create();
    const previousDiff = await createFingerprintedDiff(
      previousBuild.id,
      "fp-1",
    );
    await approvePreviousDiffs(previousBuild.id, [previousDiff], user.id);
    // Covered change.
    await createFingerprintedDiff(build.id, "fp-1");
    // Unmatched change → a human still needs to review.
    await createFingerprintedDiff(build.id, "fp-new");

    await autoApproveBuild({ build });

    const reviews = await BuildReview.query().where("buildId", build.id);
    expect(reviews).toHaveLength(0);
  });

  test("creates one automatic approval per matching approver", async ({
    previousBuild,
    build,
  }) => {
    const userA = await factory.User.create();
    const userB = await factory.User.create();
    const previousDiff = await createFingerprintedDiff(
      previousBuild.id,
      "fp-1",
    );
    await approvePreviousDiffs(previousBuild.id, [previousDiff], userA.id);
    await approvePreviousDiffs(previousBuild.id, [previousDiff], userB.id);
    await createFingerprintedDiff(build.id, "fp-1");

    await autoApproveBuild({ build });

    const reviews = await BuildReview.query().where("buildId", build.id);
    expect(reviews).toHaveLength(2);
    expect(reviews.every((review) => review.automatic)).toBe(true);
    expect(reviews.map((review) => review.userId).sort()).toEqual(
      [userA.id, userB.id].sort(),
    );
  });

  test("skips merge queue builds", async ({ previousBuild, build }) => {
    const user = await factory.User.create();
    const previousDiff = await createFingerprintedDiff(
      previousBuild.id,
      "fp-1",
    );
    await approvePreviousDiffs(previousBuild.id, [previousDiff], user.id);
    await createFingerprintedDiff(build.id, "fp-1");
    await build.$query().patch({ mergeQueue: true });

    await autoApproveBuild({ build });

    const reviews = await BuildReview.query().where("buildId", build.id);
    expect(reviews).toHaveLength(0);
  });

  test("does nothing when there is no previous approval", async ({ build }) => {
    await createFingerprintedDiff(build.id, "fp-1");

    await autoApproveBuild({ build });

    const reviews = await BuildReview.query().where("buildId", build.id);
    expect(reviews).toHaveLength(0);
  });

  test("does not override an existing review the user already made on the build", async ({
    previousBuild,
    build,
  }) => {
    const user = await factory.User.create();
    const previousDiff = await createFingerprintedDiff(
      previousBuild.id,
      "fp-1",
    );
    await approvePreviousDiffs(previousBuild.id, [previousDiff], user.id);
    await createFingerprintedDiff(build.id, "fp-1");
    // The user explicitly rejected the current build (e.g. before it concluded).
    const rejection = await factory.BuildReview.create({
      buildId: build.id,
      state: "rejected",
      userId: user.id,
    });

    await autoApproveBuild({ build });

    // No automatic approval is created; the user's rejection stands.
    const reviews = await BuildReview.query().where("buildId", build.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.id).toBe(rejection.id);
    expect(reviews[0]!.state).toBe("rejected");
  });

  test("ignores dismissed previous approvals", async ({
    previousBuild,
    build,
  }) => {
    const user = await factory.User.create();
    const previousDiff = await createFingerprintedDiff(
      previousBuild.id,
      "fp-1",
    );
    const buildReview = await approvePreviousDiffs(
      previousBuild.id,
      [previousDiff],
      user.id,
    );
    await buildReview.$query().patch({
      dismissedAt: new Date().toISOString(),
      dismissedById: user.id,
    });
    await createFingerprintedDiff(build.id, "fp-1");

    await autoApproveBuild({ build });

    const reviews = await BuildReview.query().where("buildId", build.id);
    expect(reviews).toHaveLength(0);
  });
});
