import { invariant } from "@argos/util/invariant";

import { Build, BuildReview, User } from "@/database/models";
import { sendNotification } from "@/notification";

import { publishReviewChange } from "./reviewEvents";

/**
 * Dismiss a submitted build review: stamp who dismissed it and when, notify the
 * original reviewer, and broadcast the change so watching clients update live.
 *
 * The caller is responsible for authorization and for rejecting pending or
 * already-dismissed reviews; this performs the dismissal and its side effects
 * only. Shared by the GraphQL `dismissReview` mutation and the REST API.
 */
export async function dismissBuildReview(input: {
  /** The review to dismiss, with `build.project.account` fetched. */
  review: BuildReview;
  build: Build;
  dismissedById: string;
}): Promise<BuildReview> {
  const { review, build, dismissedById } = input;

  const dismissedReview = await review.$query().patchAndFetch({
    dismissedAt: new Date().toISOString(),
    dismissedById,
  });

  await Promise.all([
    notifyReviewDismissed({ review, build, dismissedById }),
    // Notify clients watching this build so the dismissal appears live.
    publishReviewChange({
      buildId: build.id,
      type: "DISMISSED",
      review: dismissedReview,
    }),
  ]);

  return dismissedReview;
}

async function notifyReviewDismissed(input: {
  review: BuildReview;
  build: Build;
  dismissedById: string;
}): Promise<void> {
  const { review, build, dismissedById } = input;
  const { state } = review;
  if (state !== "approved" && state !== "rejected" && state !== "commented") {
    return;
  }
  if (!review.userId || review.userId === dismissedById) {
    return;
  }
  const project = build.project;
  invariant(project?.account, "project account not found");
  const [dismissedBy, buildUrl] = await Promise.all([
    User.query().findById(dismissedById).withGraphFetched("account"),
    build.getUrl(),
  ]);
  const dismissedByName = dismissedBy?.account?.displayName ?? null;
  await sendNotification({
    type: "review_dismissed",
    data: {
      accountSlug: project.account.slug,
      projectName: project.name,
      buildNumber: build.number,
      buildName: build.name,
      buildUrl,
      dismissedByName,
      state,
    },
    recipients: [review.userId],
  });
}
