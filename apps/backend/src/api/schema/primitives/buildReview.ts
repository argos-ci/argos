import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import type { BuildReview } from "@/database/models";

import { getUserAccountsByUserId, serializeUser, UserSchema } from "./user";

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
    user: UserSchema.nullable().meta({
      description: "The user who submitted the review.",
    }),
    dismissedAt: z.string().nullable().meta({
      description: "Date the review was dismissed, null if not dismissed.",
    }),
    dismissedBy: UserSchema.nullable().meta({
      description: "The user who dismissed the review, if any.",
    }),
    date: z.string().meta({ description: "Date the review was created." }),
  })
  .meta({ description: "Build review", id: "BuildReview" });

export async function serializeBuildReviews(
  reviews: BuildReview[],
): Promise<z.infer<typeof BuildReviewSchema>[]> {
  const accountByUserId = await getUserAccountsByUserId(
    reviews.flatMap((review) => [review.userId, review.dismissedById]),
  );

  return reviews.map((review) => {
    const user = review.userId
      ? (accountByUserId.get(review.userId) ?? null)
      : null;
    const dismissedBy = review.dismissedById
      ? (accountByUserId.get(review.dismissedById) ?? null)
      : null;
    return {
      id: review.id,
      buildId: review.buildId,
      state: review.state,
      user: user ? serializeUser(user) : null,
      dismissedAt: review.dismissedAt,
      dismissedBy: dismissedBy ? serializeUser(dismissedBy) : null,
      date: review.createdAt,
    };
  });
}

export async function serializeBuildReview(
  review: BuildReview,
): Promise<z.infer<typeof BuildReviewSchema>> {
  const [serialized] = await serializeBuildReviews([review]);
  invariant(serialized, "Failed to serialize build review");
  return serialized;
}
