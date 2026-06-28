import { test as base, describe, expect } from "vitest";

import {
  Build,
  BuildNotification,
  BuildNotificationSubscription,
  BuildReview,
  Comment,
  ScreenshotDiff,
  User,
} from "@/database/models";
import { factory } from "@/database/testing";
import { setupDatabase } from "@/database/testing/util";

import { createBuildReview } from "./createBuildReview";

const test = base.extend<{
  user: User;
  build: Build;
  screenshotDiffs: ScreenshotDiff[];
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  build: async ({}, use) => {
    const build = await factory.Build.create({
      conclusion: "changes-detected",
      jobStatus: "complete",
    });
    await use(build);
  },
  screenshotDiffs: async ({ build }, use) => {
    const screenshots = await factory.Screenshot.createMany(2);
    const diffs = await factory.ScreenshotDiff.createMany(2, [
      {
        buildId: build.id,
        baseScreenshotId: screenshots[0]!.id,
        compareScreenshotId: screenshots[1]!.id,
        score: 0.2,
      },
      {
        buildId: build.id,
        baseScreenshotId: screenshots[0]!.id,
        compareScreenshotId: screenshots[1]!.id,
        score: 0.4,
      },
    ]);
    await use(diffs);
  },
});

describe("#createBuildReview", () => {
  test("creates an approved review when event is APPROVE", async ({
    user,
    build,
  }) => {
    const review = await createBuildReview({
      build,
      userId: user.id,
      event: "APPROVE",
      snapshotReviews: [],
    });

    const refreshed = await BuildReview.query().findById(review.id);
    expect(refreshed?.state).toBe("approved");
    expect(refreshed?.userId).toBe(user.id);
    expect(refreshed?.buildId).toBe(build.id);
  });

  test("defaults to a non-automatic review", async ({ user, build }) => {
    const review = await createBuildReview({
      build,
      userId: user.id,
      event: "APPROVE",
      snapshotReviews: [],
    });

    const refreshed = await BuildReview.query().findById(review.id);
    expect(refreshed?.automatic).toBe(false);
  });

  test("marks the review as automatic when requested", async ({
    user,
    build,
  }) => {
    const review = await createBuildReview({
      build,
      userId: user.id,
      event: "APPROVE",
      automatic: true,
      snapshotReviews: [],
    });

    const refreshed = await BuildReview.query().findById(review.id);
    expect(refreshed?.state).toBe("approved");
    expect(refreshed?.automatic).toBe(true);
    // Automatic reviews are silent: the user is not auto-subscribed to the build.
    const subscriptionCount = await BuildNotificationSubscription.query()
      .where("buildId", build.id)
      .where("userId", user.id)
      .resultSize();
    expect(subscriptionCount).toBe(0);
  });

  test("creates a rejected review when event is REJECT", async ({
    user,
    build,
  }) => {
    const review = await createBuildReview({
      build,
      userId: user.id,
      event: "REJECT",
      snapshotReviews: [],
    });

    const refreshed = await BuildReview.query().findById(review.id);
    expect(refreshed?.state).toBe("rejected");
  });

  test("creates a commented review when event is COMMENT", async ({
    user,
    build,
  }) => {
    const review = await createBuildReview({
      build,
      userId: user.id,
      event: "COMMENT",
      snapshotReviews: [],
    });

    const refreshed = await BuildReview.query().findById(review.id);
    expect(refreshed?.state).toBe("commented");
  });

  test("persists snapshot reviews linked to the build review", async ({
    user,
    build,
    screenshotDiffs,
  }) => {
    const review = await createBuildReview({
      build,
      userId: user.id,
      event: "REJECT",
      snapshotReviews: [
        { screenshotDiffId: screenshotDiffs[0]!.id, state: "rejected" },
        { screenshotDiffId: screenshotDiffs[1]!.id, state: "approved" },
      ],
    });

    const refreshed = await BuildReview.query()
      .findById(review.id)
      .withGraphFetched("screenshotDiffReviews");
    expect(refreshed?.screenshotDiffReviews).toHaveLength(2);
    const byDiffId = Object.fromEntries(
      (refreshed?.screenshotDiffReviews ?? []).map((r) => [
        r.screenshotDiffId,
        r.state,
      ]),
    );
    expect(byDiffId[screenshotDiffs[0]!.id]).toBe("rejected");
    expect(byDiffId[screenshotDiffs[1]!.id]).toBe("approved");
  });

  test("attaches a comment when a body is provided", async ({
    user,
    build,
  }) => {
    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Looks good" }],
        },
      ],
    };
    const review = await createBuildReview({
      build,
      userId: user.id,
      event: "COMMENT",
      body,
      snapshotReviews: [],
    });

    const comments = await Comment.query().where({ buildReviewId: review.id });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.userId).toBe(user.id);
    expect(comments[0]?.buildId).toBe(build.id);
    expect(comments[0]?.content).toEqual(body);
  });

  test("does not create a comment when body is missing", async ({
    user,
    build,
  }) => {
    const review = await createBuildReview({
      build,
      userId: user.id,
      event: "APPROVE",
      snapshotReviews: [],
    });

    const comments = await Comment.query().where({ buildReviewId: review.id });
    expect(comments).toHaveLength(0);
  });

  test("pushes a diff-accepted build notification when approving", async ({
    user,
    build,
  }) => {
    await createBuildReview({
      build,
      userId: user.id,
      event: "APPROVE",
      snapshotReviews: [],
    });

    const notifications = await BuildNotification.query().where({
      buildId: build.id,
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe("diff-accepted");
  });

  test("pushes a diff-rejected build notification when rejecting", async ({
    user,
    build,
  }) => {
    await createBuildReview({
      build,
      userId: user.id,
      event: "REJECT",
      snapshotReviews: [],
    });

    const notifications = await BuildNotification.query().where({
      buildId: build.id,
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe("diff-rejected");
  });

  test("pushes a diff-detected build notification when commenting", async ({
    user,
    build,
  }) => {
    await createBuildReview({
      build,
      userId: user.id,
      event: "COMMENT",
      snapshotReviews: [],
    });

    const notifications = await BuildNotification.query().where({
      buildId: build.id,
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe("diff-detected");
  });

  test("pushes a diff-rejected build notification when an older user rejection still rejects the build", async ({
    user,
    build,
  }) => {
    const otherUser = await factory.User.create();
    await factory.BuildReview.create({
      buildId: build.id,
      userId: otherUser.id,
      state: "rejected",
    });

    await createBuildReview({
      build,
      userId: user.id,
      event: "APPROVE",
      snapshotReviews: [],
    });

    const notifications = await BuildNotification.query()
      .where({
        buildId: build.id,
      })
      .orderBy("createdAt", "desc");
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe("diff-rejected");
  });
});
