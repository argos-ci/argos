import type { TransactionOrKnex } from "objection";

import { isUniqueViolationError } from "@/database/error";
import { Build, BuildReview } from "@/database/models";

/**
 * Find the user's active (non-dismissed) pending review for a build, if any.
 * Pending reviews hold draft comments that are only visible to their author
 * until the review is submitted.
 */
export async function getViewerPendingReview(input: {
  buildId: string;
  userId: string;
  trx?: TransactionOrKnex | undefined;
}): Promise<BuildReview | null> {
  const { buildId, userId, trx } = input;
  const review = await BuildReview.query(trx).findOne({
    buildId,
    userId,
    state: "pending",
    dismissedAt: null,
  });
  return review ?? null;
}

/**
 * Get the user's active pending review for a build, creating one if it does not
 * exist yet. A partial unique index (`build_reviews_pending_unique`) enforces a
 * single active pending review per (build, user); on a concurrent insert we
 * catch the unique violation and re-read the winning row.
 */
export async function getOrCreatePendingBuildReview(input: {
  build: Build;
  userId: string;
  trx?: TransactionOrKnex | undefined;
}): Promise<BuildReview> {
  const { build, userId, trx } = input;
  const existing = await getViewerPendingReview({
    buildId: build.id,
    userId,
    trx,
  });
  if (existing) {
    return existing;
  }
  try {
    return await BuildReview.query(trx).insert({
      buildId: build.id,
      userId,
      state: "pending",
    });
  } catch (error) {
    if (isUniqueViolationError(error)) {
      const review = await getViewerPendingReview({
        buildId: build.id,
        userId,
        trx,
      });
      if (review) {
        return review;
      }
    }
    throw error;
  }
}
