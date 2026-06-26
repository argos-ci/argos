import type { Build, Comment } from "@/database/models";
import { sqids } from "@/util/sqids";

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
 * Decodes a public comment identifier back to the underlying model ID.
 */
export function parseCommentId(input: string): string {
  if (!input.startsWith(COMMENT_ID_PREFIX)) {
    throw new Error("Invalid comment ID format");
  }

  const decoded = sqids.decode(input.slice(COMMENT_ID_PREFIX.length))[0];
  if (decoded === undefined) {
    throw new Error("Invalid comment ID format");
  }

  return String(decoded);
}

/**
 * Build the shareable URL pointing at a specific comment, i.e. the comment's
 * build page with the comment ID as the fragment so the page scrolls to it.
 */
export async function getCommentUrl(input: {
  build: Build;
  comment: Comment;
}): Promise<string> {
  const buildUrl = await input.build.getUrl();
  return `${buildUrl}#${formatCommentId(input.comment.id)}`;
}
