import type { QueryBuilder } from "objection";

import { BuildReview, Comment } from "@/database/models";

import type { CommentTarget } from "./target";

/**
 * Restrict a `Comment` query to the rows visible to a given viewer: standalone
 * comments (no review), comments on a submitted review, or comments on the
 * viewer's own pending (draft) review — draft comments stay hidden from everyone
 * but their author until the review is submitted. Soft-deleted comments are
 * always excluded.
 *
 * This is the single source of truth for comment visibility, shared by the
 * GraphQL comment loaders (which batch across many builds/tests) and the REST
 * API (which scopes to one build or test).
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
async function getVisibleBuildComments(input: {
  buildId: string;
  viewerUserId: string | null;
}): Promise<Comment[]> {
  const { buildId, viewerUserId } = input;
  return filterVisibleComments(
    Comment.query().where("buildId", buildId),
    viewerUserId,
  ).orderBy("createdAt", "asc");
}

/**
 * Load the comments visible to a given viewer on a single test, oldest first.
 * Test comments never belong to a review, so only the soft-deletion filter
 * actually narrows them.
 */
async function getVisibleTestComments(input: {
  testId: string;
  viewerUserId: string | null;
}): Promise<Comment[]> {
  const { testId, viewerUserId } = input;
  return filterVisibleComments(
    Comment.query().where("testId", testId),
    viewerUserId,
  ).orderBy("createdAt", "asc");
}

/**
 * Load the comments visible to a given viewer on a build or a test, oldest
 * first. Used by the REST endpoints, which serve both from one implementation.
 */
export async function getVisibleTargetComments(input: {
  target: CommentTarget;
  viewerUserId: string | null;
}): Promise<Comment[]> {
  const { target, viewerUserId } = input;
  switch (target.type) {
    case "build":
      return getVisibleBuildComments({
        buildId: target.build.id,
        viewerUserId,
      });
    case "test":
      return getVisibleTestComments({ testId: target.test.id, viewerUserId });
  }
}
