import { AutomationEvents } from "@argos/schemas/automation-event";
import type { BuildReviewEvent } from "@argos/schemas/build-review";
import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { triggerAndRunAutomation } from "@/automation";
import { pushBuildNotification } from "@/build-notification/notifications";
import type { BuildNotification } from "@/database/models";
import {
  Build,
  BuildReview,
  Comment,
  ScreenshotDiffReview,
} from "@/database/models";
import { transaction } from "@/database/transaction";

export type ReviewState = "approved" | "rejected" | "commented" | "pending";

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

function getBuildNotificationType(
  status: BuildAggregatedStatus,
): BuildNotification["type"] | null {
  switch (status) {
    case "accepted":
      return "diff-accepted";
    case "rejected":
      return "diff-rejected";
    case "changes-detected":
      return "diff-detected";
    case "no-changes":
      return "no-diff-detected";
    case "pending":
      return "queued";
    case "progress":
      return "progress";
    case "aborted":
    case "error":
    case "expired":
      return null;
    default:
      assertNever(status);
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
  const [status] = await Build.getAggregatedBuildStatuses([build]);
  invariant(status, `Build status not found for build: ${build.id}`);
  const notificationType = getBuildNotificationType(status);

  await Promise.all([
    notificationType
      ? pushBuildNotification({
          buildId: build.id,
          type: notificationType,
        })
      : Promise.resolve(),
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
