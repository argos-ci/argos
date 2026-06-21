import { z } from "zod";

import type { BuildReview } from "@/database/models";

export const ReviewStateSchema = z
  .enum(["approved", "rejected", "commented", "pending"])
  .meta({
    description:
      "State of a build review: approved, rejected, commented (neutral) or pending (an unsubmitted draft).",
  });

export const BuildReviewSchema = z
  .object({
    id: z.string(),
    buildId: z.string(),
    state: ReviewStateSchema,
    userId: z.string().nullable().meta({
      description: "ID of the user who submitted the review.",
    }),
    dismissedAt: z.string().nullable().meta({
      description: "Date the review was dismissed, null if not dismissed.",
    }),
    dismissedById: z.string().nullable().meta({
      description: "ID of the user who dismissed the review, if any.",
    }),
    date: z.string().meta({ description: "Date the review was created." }),
  })
  .meta({ description: "Build review", id: "BuildReview" });

export function serializeBuildReview(
  review: BuildReview,
): z.infer<typeof BuildReviewSchema> {
  return {
    id: review.id,
    buildId: review.buildId,
    state: review.state,
    userId: review.userId,
    dismissedAt: review.dismissedAt,
    dismissedById: review.dismissedById,
    date: review.createdAt,
  };
}

export function serializeBuildReviews(
  reviews: BuildReview[],
): z.infer<typeof BuildReviewSchema>[] {
  return reviews.map(serializeBuildReview);
}
