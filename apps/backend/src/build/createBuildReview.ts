import { AutomationEvents } from "@argos/schemas/automation-event";

import { triggerAndRunAutomation } from "@/automation";
import { pushBuildNotification } from "@/build-notification/notifications";
import { Build, BuildReview, ScreenshotDiffReview } from "@/database/models";
import { transaction } from "@/database/transaction";

export type ReviewState = "approved" | "rejected";

export async function createBuildReview(input: {
  build: Build;
  userId: string;
  state: ReviewState;
  snapshotReviews: {
    screenshotDiffId: string;
    state: ReviewState;
  }[];
}): Promise<BuildReview> {
  const { build, userId, state, snapshotReviews } = input;

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

    return buildReview;
  });

  await Promise.all([
    pushBuildNotification({
      buildId: build.id,
      type: state === "approved" ? "diff-accepted" : "diff-rejected",
    }),
    triggerAndRunAutomation({
      projectId: build.projectId,
      message: {
        event: AutomationEvents.BuildReviewed,
        payload: { build, buildReview },
      },
    }),
  ]);

  return buildReview;
}
