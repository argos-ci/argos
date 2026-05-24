import { AutomationEvents } from "@argos/schemas/automation-event";
import type { BuildReviewEvent } from "@argos/schemas/build-review";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { triggerAndRunAutomation } from "@/automation";
import { pushBuildNotification } from "@/build-notification/notifications";
import {
  Build,
  BuildReview,
  Comment,
  ScreenshotDiffReview,
} from "@/database/models";
import { transaction } from "@/database/transaction";

export type ReviewState =
  | "approved"
  | "rejected"
  | "commented"
  | "dismissed"
  | "pending";

export type ScreenshotDiffReviewState = "approved" | "rejected";

function getReviewStateFromEvent(event: BuildReviewEvent): ReviewState {
  switch (event) {
    case "APPROVE":
      return "approved";
    case "REJECT":
      return "rejected";
    case "COMMENT":
      return "commented";
    default:
      assertNever(event);
  }
}

export async function createBuildReview(input: {
  build: Build;
  userId: string;
  event: BuildReviewEvent;
  body?: unknown;
  snapshotReviews: {
    screenshotDiffId: string;
    state: ScreenshotDiffReviewState;
  }[];
}): Promise<BuildReview> {
  const { build, userId, event, body, snapshotReviews } = input;
  const state = getReviewStateFromEvent(event);

  const buildReview = await transaction(async (trx) => {
    const buildReview = await BuildReview.query(trx).insert({
      buildId: build.id,
      userId,
      state,
    });

    if (snapshotReviews.length > 0) {
      await ScreenshotDiffReview.query(trx).insert(
        snapshotReviews.map((snapshotReview) => ({
          screenshotDiffId: snapshotReview.screenshotDiffId,
          buildReviewId: buildReview.id,
          state: snapshotReview.state,
        })),
      );
    }

    if (body != null) {
      await Comment.query(trx).insert({
        userId,
        buildId: build.id,
        buildReviewId: buildReview.id,
        content: body,
      });
    }

    return buildReview;
  });

  const compareScreenshotBucket = await build.$relatedQuery(
    "compareScreenshotBucket",
  );
  invariant(
    compareScreenshotBucket,
    `Compare screenshot bucket not found for build: ${build.id}`,
  );

  await Promise.all([
    pushBuildNotification({
      buildId: build.id,
      type: state === "approved" ? "diff-accepted" : "diff-rejected",
    }),
    triggerAndRunAutomation({
      projectId: build.projectId,
      message: {
        event: AutomationEvents.BuildReviewed,
        payload: { build, compareScreenshotBucket, buildReview },
      },
    }),
  ]);

  return buildReview;
}
