import { z } from "zod";

import { Comment } from "@/database/models/Comment";
import { redisPubSub } from "@/util/redis";

const commentChangeSchema = z.object({
  type: z.enum(["ADDED", "UPDATED", "DELETED"]),
  comment: z.record(z.string(), z.unknown()),
});

export type CommentChangeType = z.infer<typeof commentChangeSchema>["type"];

export type CommentChange = {
  type: CommentChangeType;
  comment: Comment;
};

function getCommentChannel(buildId: string): string {
  return `build-comment-change:${buildId}`;
}

/**
 * Publish a comment change so every client subscribed to the build receives it
 * live. Only the comment row travels through Redis; relations (author,
 * mentions, reactions) are loaded per subscriber by the GraphQL field
 * resolvers from the rehydrated comment.
 */
export async function publishCommentChange(input: {
  buildId: string;
  type: CommentChangeType;
  comment: Comment;
}): Promise<void> {
  await redisPubSub.publish(getCommentChannel(input.buildId), {
    type: input.type,
    comment: input.comment.toJSON(),
  });
}

/**
 * Yield every comment change published for a build until the iterator is closed
 * (when the GraphQL subscription ends). Each payload is validated then
 * rehydrated into a {@link Comment} model so the existing field resolvers can
 * resolve it.
 */
export async function* subscribeToCommentChanges(
  buildId: string,
): AsyncGenerator<CommentChange> {
  const iterator = redisPubSub.subscribe(getCommentChannel(buildId));
  for await (const raw of iterator) {
    const payload = commentChangeSchema.parse(raw);
    yield {
      type: payload.type,
      comment: Comment.fromJson(payload.comment, { skipValidation: true }),
    };
  }
}
