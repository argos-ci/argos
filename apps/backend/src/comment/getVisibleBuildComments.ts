import type { QueryBuilder } from "objection";

import { BuildReview, Comment } from "@/database/models";

/**
 * Restrict a `Comment` query to the rows visible to a given viewer: standalone
 * comments (no review), comments on a submitted review, or comments on the
 * viewer's own pending (draft) review — draft comments stay hidden from everyone
 * but their author until the review is submitted. Soft-deleted comments are
 * always excluded.
 *
 * This is the single source of truth for comment visibility, shared by the
 * GraphQL `BuildPublishedComments` loader (which batches across many builds) and
 * the REST API (which scopes to one build).
 */
export function filterVisibleComments<QB extends QueryBuilder<Comment, any>>(
  query: QB,
  viewerUserId: string | null,
): QB {
  return query.whereNull("deletedAt").where((qb) => {
    qb.whereNull("buildReviewId").orWhereExists(
      BuildReview.query()
        .select(1)
        .whereColumn("build_reviews.id", "comments.buildReviewId")
        .where((sub) => {
          sub.whereNot("build_reviews.state", "pending");
          if (viewerUserId) {
            sub.orWhere("build_reviews.userId", viewerUserId);
          }
        }),
    );
  }) as QB;
}

/**
 * Load the comments visible to a given viewer on a single build, oldest first.
 */
export async function getVisibleBuildComments(input: {
  buildId: string;
  viewerUserId: string | null;
}): Promise<Comment[]> {
  const { buildId, viewerUserId } = input;
  return filterVisibleComments(
    Comment.query().where("buildId", buildId),
    viewerUserId,
  ).orderBy("createdAt", "asc");
}
