import { AutomationEvents } from "@argos/schemas/automation-event";
import type { BuildReviewEvent } from "@argos/schemas/build-review";
import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";

import { triggerAndRunAutomation } from "@/automation";
import { pushBuildNotification } from "@/build-notification/notifications";
import { renderCommentHtmlWithMentions } from "@/comment/mentions";
import { isCommentTooLarge, validateCommentJson } from "@/comment/validate";
import type { BuildNotification } from "@/database/models";
import {
  Build,
  BuildReview,
  Comment,
  ScreenshotDiffReview,
  User,
} from "@/database/models";
import {
  autoSubscribeUserToBuild,
  getBuildSubscribedUserIds,
} from "@/database/services/build-notification-subscription";
import { subscribeUserToCommentThread } from "@/database/services/comment-notification-subscription";
import { transaction } from "@/database/transaction";
import { sendNotification } from "@/notification";
import { boom } from "@/util/error";

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
  body?: JSONContent | undefined;
  snapshotReviews: {
    screenshotDiffId: string;
    state: ScreenshotDiffReviewState;
  }[];
}): Promise<BuildReview> {
  const { build, userId, event, body, snapshotReviews } = input;

  if (body !== undefined && !validateCommentJson(body)) {
    throw boom(400, "Invalid comment body");
  }

  if (body !== undefined && isCommentTooLarge(body)) {
    throw boom(400, "Comment is too large");
  }

  const state = getReviewStateFromEvent(event);

  const { buildReview, comment } = await transaction(async (trx) => {
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

    const comment =
      body != null
        ? await Comment.query(trx).insert({
            userId,
            buildId: build.id,
            buildReviewId: buildReview.id,
            content: body,
          })
        : null;

    return { buildReview, comment };
  });

  if (comment) {
    await subscribeUserToCommentThread({ commentId: comment.id, userId });
  }

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
    autoSubscribeUserToBuild({ buildId: build.id, userId }),
    notifyBuildSubscribers({ build, buildReview, comment }),
  ]);

  return buildReview;
}

async function notifyBuildSubscribers(input: {
  build: Build;
  buildReview: BuildReview;
  comment: Comment | null;
}): Promise<void> {
  const { build, buildReview, comment } = input;
  const { state } = buildReview;
  if (state !== "approved" && state !== "rejected" && state !== "commented") {
    return;
  }
  invariant(buildReview.userId, "review should have a userId");
  const subscribedUserIds = await getBuildSubscribedUserIds(build.id);
  const recipients = subscribedUserIds.filter(
    (id) => id !== buildReview.userId,
  );
  if (recipients.length === 0) {
    return;
  }
  const [project, reviewer, buildUrl] = await Promise.all([
    build.$relatedQuery("project").withGraphFetched("account"),
    User.query().findById(buildReview.userId).withGraphFetched("account"),
    build.getUrl(),
  ]);
  invariant(project, "project not found");
  invariant(project.account, "project account not found");
  const reviewerName = reviewer?.account?.displayName ?? null;
  await sendNotification({
    type: "review_submitted",
    data: {
      accountSlug: project.account.slug,
      projectName: project.name,
      buildNumber: build.number,
      buildName: build.name,
      buildUrl,
      reviewerName,
      state,
      bodyHtml: comment ? await renderCommentHtmlWithMentions(comment) : null,
    },
    recipients,
  });
}
