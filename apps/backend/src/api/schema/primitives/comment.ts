import { z } from "zod";

import { schema as proseMirrorSchema } from "@/comment/schema";
import {
  Account,
  BuildReview,
  Comment,
  CommentReaction,
} from "@/database/models";

/**
 * Body of a comment as accepted by the write endpoints: either Markdown text or
 * the JSON representation of a rich-text document. See `resolveCommentBody`.
 */
export const CommentBodyInputSchema = z
  .union([z.string(), z.record(z.string(), z.unknown())])
  .meta({
    description:
      "Comment content. Either Markdown text or the JSON representation of a rich-text document.",
  });

const CommentReactionGroupSchema = z
  .object({
    emoji: z.string().meta({ description: "The emoji used for the reaction." }),
    count: z
      .number()
      .meta({ description: "Number of users who reacted with this emoji." }),
    userIds: z
      .array(z.string())
      .meta({ description: "IDs of the users who reacted with this emoji." }),
  })
  .meta({ description: "Reactions of a single emoji on a comment." });

const CommentAuthorSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string().nullable(),
  })
  .meta({ description: "Author of a comment.", id: "CommentAuthor" });

const CommentAnchorSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("point"),
      x: z.number(),
      y: z.number(),
    }),
    z.object({
      type: z.literal("lines"),
      from: z.number().int(),
      to: z.number().int(),
    }),
  ])
  .nullable()
  .meta({
    description:
      "Where on the referenced screenshot diff the comment points. A point uses normalized (0–1) coordinates; lines is a 1-based inclusive range. Null means the whole diff.",
  });

export const CommentSchema = z
  .object({
    id: z.string(),
    buildId: z.string(),
    threadId: z
      .string()
      .nullable()
      .meta({ description: "Root comment ID when this comment is a reply." }),
    body: z
      .unknown()
      .meta({ description: "Rich-text JSON content of the comment." }),
    text: z
      .string()
      .meta({ description: "Plain-text rendering of the comment content." }),
    author: CommentAuthorSchema.nullable(),
    screenshotDiffId: z.string().nullable().meta({
      description: "Screenshot diff this comment is anchored to, if any.",
    }),
    anchor: CommentAnchorSchema,
    pending: z.boolean().meta({
      description:
        "Whether the comment belongs to a pending (unsubmitted) review and is only visible to its author.",
    }),
    resolvedAt: z.string().nullable().meta({
      description:
        "Date the thread was resolved, null if not resolved. Only set on a root comment.",
    }),
    editedAt: z.string().nullable().meta({
      description: "Date the comment was last edited, null if never edited.",
    }),
    createdAt: z.string().meta({ description: "Date the comment was posted." }),
    reactions: z.array(CommentReactionGroupSchema),
  })
  .meta({ description: "A comment posted on a build.", id: "Comment" });

/** Best-effort plain-text rendering of a stored rich-text comment. */
function commentText(content: unknown): string {
  try {
    return proseMirrorSchema.nodeFromJSON(content).textContent;
  } catch {
    return "";
  }
}

/**
 * Serialize comments into the public API shape, batching the relations (author
 * accounts, reactions, owning reviews) to avoid N+1 queries.
 */
export async function serializeComments(
  comments: Comment[],
): Promise<z.infer<typeof CommentSchema>[]> {
  const commentIds = comments.map((comment) => comment.id);
  const reviewIds = [
    ...new Set(
      comments
        .map((comment) => comment.buildReviewId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const userIds = [
    ...new Set(
      comments
        .map((comment) => comment.userId)
        .filter((id): id is string => id !== null),
    ),
  ];

  const [reactions, reviews, accounts] = await Promise.all([
    commentIds.length > 0
      ? CommentReaction.query()
          .whereIn("commentId", commentIds)
          .orderBy("createdAt", "asc")
      : [],
    reviewIds.length > 0
      ? BuildReview.query().findByIds(reviewIds)
      : ([] as BuildReview[]),
    userIds.length > 0
      ? Account.query().whereIn("userId", userIds)
      : ([] as Account[]),
  ]);

  // Group reactions per comment, preserving insertion order so the emoji groups
  // come out oldest-first.
  const reactionsByComment = new Map<string, CommentReaction[]>();
  for (const reaction of reactions) {
    const list = reactionsByComment.get(reaction.commentId) ?? [];
    list.push(reaction);
    reactionsByComment.set(reaction.commentId, list);
  }

  const reviewById = new Map(reviews.map((review) => [review.id, review]));
  const accountByUserId = new Map(
    accounts.flatMap((account) =>
      account.userId ? [[account.userId, account] as const] : [],
    ),
  );

  return comments.map((comment) => {
    const account = comment.userId
      ? (accountByUserId.get(comment.userId) ?? null)
      : null;

    const groups = new Map<string, string[]>();
    for (const reaction of reactionsByComment.get(comment.id) ?? []) {
      const list = groups.get(reaction.emoji) ?? [];
      list.push(reaction.userId);
      groups.set(reaction.emoji, list);
    }

    const pending = comment.buildReviewId
      ? reviewById.get(comment.buildReviewId)?.state === "pending"
      : false;

    return {
      id: comment.id,
      buildId: comment.buildId,
      threadId: comment.threadId,
      body: comment.content,
      text: commentText(comment.content),
      author: account
        ? { id: account.id, slug: account.slug, name: account.displayName }
        : null,
      screenshotDiffId: comment.screenshotDiffId,
      anchor: comment.anchor,
      pending,
      resolvedAt: comment.resolvedAt,
      editedAt: comment.editedAt,
      createdAt: comment.createdAt,
      reactions: Array.from(groups.entries()).map(([emoji, ids]) => ({
        emoji,
        count: ids.length,
        userIds: ids,
      })),
    };
  });
}

export async function serializeComment(
  comment: Comment,
): Promise<z.infer<typeof CommentSchema>> {
  const [serialized] = await serializeComments([comment]);
  if (!serialized) {
    throw new Error("Failed to serialize comment");
  }
  return serialized;
}
