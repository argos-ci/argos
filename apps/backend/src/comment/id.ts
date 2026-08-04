import type { Comment } from "@/database/models";
import { sqids } from "@/util/sqids";

import { getCommentTargetUrl, type CommentTarget } from "./target";

const COMMENT_ID_PREFIX = "comment-";

/**
 * Encodes a comment model ID into the public identifier format
 * (e.g. `comment-xf23d`), used as the GraphQL id and to build shareable links
 * to a comment.
 */
export function formatCommentId(commentId: string | number): string {
  return `${COMMENT_ID_PREFIX}${sqids.encode([Number(commentId)])}`;
}

/**
 * Decodes a public comment identifier back to the underlying model ID, or
 * `null` when the input is not one. Callers that address a comment by id use
 * this, so a malformed id reads as "no such comment" rather than an error.
 */
export function safeParseCommentId(input: string): string | null {
  if (!input.startsWith(COMMENT_ID_PREFIX)) {
    return null;
  }

  const decoded = sqids.decode(input.slice(COMMENT_ID_PREFIX.length))[0];
  if (decoded === undefined) {
    return null;
  }

  return String(decoded);
}

/**
 * Decodes a public comment identifier back to the underlying model ID.
 */
export function parseCommentId(input: string): string {
  const parsed = safeParseCommentId(input);
  if (parsed === null) {
    throw new Error("Invalid comment ID format");
  }
  return parsed;
}

/**
 * Build the shareable URL pointing at a specific comment, i.e. the page of the
 * build or test it was posted on, with the comment ID as the fragment so the
 * page scrolls to it.
 */
export async function getCommentUrl(input: {
  target: CommentTarget;
  comment: Comment;
}): Promise<string> {
  const targetUrl = await getCommentTargetUrl(input.target);
  return `${targetUrl}#${formatCommentId(input.comment.id)}`;
}
