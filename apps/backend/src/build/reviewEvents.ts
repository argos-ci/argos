import { z } from "zod";

import { BuildReview } from "@/database/models/BuildReview";
import { redisPubSub } from "@/util/redis";

const reviewChangeSchema = z.object({
  type: z.enum(["SUBMITTED", "DISMISSED"]),
  review: z.record(z.string(), z.unknown()),
});

export type ReviewChangeType = z.infer<typeof reviewChangeSchema>["type"];

export type ReviewChange = {
  type: ReviewChangeType;
  review: BuildReview;
};

function getReviewChannel(buildId: string): string {
  return `build-review-change:${buildId}`;
}

/**
 * Publish a review change so every client subscribed to the build receives it
 * live. Only the review row travels through Redis; relations (author,
 * dismisser) are loaded per subscriber by the GraphQL field resolvers from the
 * rehydrated review.
 */
export async function publishReviewChange(input: {
  buildId: string;
  type: ReviewChangeType;
  review: BuildReview;
}): Promise<void> {
  await redisPubSub.publish(getReviewChannel(input.buildId), {
    type: input.type,
    review: input.review.toJSON(),
  });
}

/**
 * Yield every review change published for a build until the iterator is closed
 * (when the GraphQL subscription ends). Each payload is validated then
 * rehydrated into a {@link BuildReview} model so the existing field resolvers
 * can resolve it.
 */
export async function* subscribeToReviewChanges(
  buildId: string,
): AsyncGenerator<ReviewChange> {
  const iterator = redisPubSub.subscribe(getReviewChannel(buildId));
  for await (const raw of iterator) {
    const payload = reviewChangeSchema.parse(raw);
    yield {
      type: payload.type,
      review: BuildReview.fromJson(payload.review, { skipValidation: true }),
    };
  }
}
