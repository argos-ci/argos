import { assertNever } from "@argos/util/assertNever";
import type { QueryBuilder } from "objection";

import { knex } from "@/database";
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
 * The most comments a single test's activity feed serves.
 *
 * A build is commented on for the few days it stays relevant, but a test lives
 * as long as the project does, so its thread list has no natural end — without a
 * bound, every page load would grow forever. The cap keeps the newest comments
 * (a feed's tail is what people read) and the frontend already drops replies
 * whose root fell outside the window, so a truncated feed degrades into fewer
 * threads rather than into broken ones.
 */
export const TEST_COMMENTS_LIMIT = 200;

/**
 * The comments visible to a given viewer on one or more tests, oldest first,
 * capped at the newest {@link TEST_COMMENTS_LIMIT} per test. Test comments never
 * belong to a review, so of the shared visibility rules only the soft-deletion
 * filter actually narrows them.
 *
 * Shared by the REST endpoint (one test) and the GraphQL loader (a batch), which
 * is why the cap is a `row_number()` window rather than a plain `limit`: a limit
 * would bound the batch instead of each test in it, and silently under-serve
 * every test but the first.
 */
export function getVisibleTestCommentsQuery(input: {
  testIds: string[];
  viewerUserId: string | null;
}): QueryBuilder<Comment, Comment[]> {
  const { testIds, viewerUserId } = input;
  return Comment.query()
    .with(
      "ranked",
      filterVisibleComments(
        Comment.query().whereIn("testId", testIds),
        viewerUserId,
      ).select(
        "id",
        knex.raw(
          'row_number() over (partition by "testId" order by "createdAt" desc, "id" desc) as "rank"',
        ),
      ),
    )
    .whereIn(
      "id",
      knex.select("id").from("ranked").where("rank", "<=", TEST_COMMENTS_LIMIT),
    )
    .orderBy("createdAt", "asc");
}

/**
 * The most comments a single media's thread list serves. A media expires, so the
 * list is naturally bounded — but the GraphQL loader batches across every media
 * in a library page, so the cap is a window function for the same reason the
 * test one is: a plain limit would bound the batch, not each media in it.
 */
const MEDIA_COMMENTS_LIMIT = 200;

/**
 * The comments visible to a given viewer on one or more media, oldest first.
 * Media comments never belong to a review, so of the shared visibility rules
 * only the soft-deletion filter actually narrows them.
 *
 * Takes a list rather than one id so the GraphQL loader can batch across a
 * library page, which is also why the cap is a window function.
 */
export function getVisibleMediaCommentsQuery(input: {
  mediaIds: string[];
  viewerUserId: string | null;
}): QueryBuilder<Comment, Comment[]> {
  const { mediaIds, viewerUserId } = input;
  return Comment.query()
    .with(
      "ranked",
      filterVisibleComments(
        Comment.query().whereIn("mediaId", mediaIds),
        viewerUserId,
      ).select(
        "id",
        knex.raw(
          'row_number() over (partition by "mediaId" order by "createdAt" desc, "id" desc) as "rank"',
        ),
      ),
    )
    .whereIn(
      "id",
      knex
        .select("id")
        .from("ranked")
        .where("rank", "<=", MEDIA_COMMENTS_LIMIT),
    )
    .orderBy("createdAt", "asc");
}

/**
 * Load the comments visible to a given viewer on a build, a test or a media,
 * oldest first. Used by the REST endpoints, which serve all three from one
 * implementation.
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
      return getVisibleTestCommentsQuery({
        testIds: [target.test.id],
        viewerUserId,
      });
    case "media":
      return getVisibleMediaCommentsQuery({
        mediaIds: [target.media.id],
        viewerUserId,
      });
    default:
      assertNever(target);
  }
}
