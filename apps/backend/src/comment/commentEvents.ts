import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { BuildReview } from "@/database/models/BuildReview";
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

function getBuildCommentChannel(buildId: string): string {
  return `build-comment-change:${buildId}`;
}

function getTestCommentChannel(testId: string): string {
  return `test-comment-change:${testId}`;
}

function getMediaCommentChannel(mediaId: string): string {
  return `media-comment-change:${mediaId}`;
}

/** The channel a comment's changes are broadcast on, from its own target. */
function getCommentChannel(comment: Comment): string {
  if (comment.buildId) {
    return getBuildCommentChannel(comment.buildId);
  }
  if (comment.testId) {
    return getTestCommentChannel(comment.testId);
  }
  invariant(comment.mediaId, "Comment has no target");
  return getMediaCommentChannel(comment.mediaId);
}

/**
 * Publish a comment change so every client watching the comment's target
 * receives it live. Only the comment row travels through Redis; relations
 * (author, mentions, reactions) are loaded per subscriber by the GraphQL field
 * resolvers from the rehydrated comment.
 *
 * The channel is derived from the comment itself, so every operation on a
 * comment broadcasts to the right audience without having to know whether it
 * lives on a build or on a test.
 *
 * Comments belonging to a pending (unsubmitted) review are drafts visible only
 * to their author, so they are never broadcast — the channel reaches every
 * build viewer and has no per-recipient filtering. Guarding here (rather than
 * at each call site) keeps every path — edits, reactions, thread resolution,
 * deletion — from leaking a draft. Once the review is submitted the comments
 * are no longer pending and broadcast normally (e.g. from
 * `notifyReviewCommentsWentLive`).
 */
export async function publishCommentChange(input: {
  type: CommentChangeType;
  comment: Comment;
}): Promise<void> {
  const { comment } = input;
  if (comment.buildReviewId) {
    const review = await BuildReview.query()
      .findById(comment.buildReviewId)
      .select("state");
    if (review?.state === "pending") {
      return;
    }
  }
  const channel = getCommentChannel(comment);
  await redisPubSub.publish(channel, {
    type: input.type,
    comment: comment.toJSON(),
  });
}

/**
 * Yield every comment change published on a channel until the iterator is
 * closed (when the GraphQL subscription ends). Each payload is validated then
 * rehydrated into a {@link Comment} model so the existing field resolvers can
 * resolve it.
 */
async function* subscribeToChannel(
  channel: string,
): AsyncGenerator<CommentChange> {
  const iterator = redisPubSub.subscribe(channel);
  for await (const raw of iterator) {
    const payload = commentChangeSchema.parse(raw);
    yield {
      type: payload.type,
      comment: Comment.fromJson(payload.comment, { skipValidation: true }),
    };
  }
}

/** Yield every comment change published for a build. */
export function subscribeToBuildCommentChanges(
  buildId: string,
): AsyncGenerator<CommentChange> {
  return subscribeToChannel(getBuildCommentChannel(buildId));
}

/** Yield every comment change published for a test. */
export function subscribeToTestCommentChanges(
  testId: string,
): AsyncGenerator<CommentChange> {
  return subscribeToChannel(getTestCommentChannel(testId));
}
