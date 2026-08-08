import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { Build, Comment, Media, Project, Test } from "@/database/models";

/**
 * What a comment is posted on: a build (where it can also belong to a review and
 * point at a screenshot diff), a test, or an uploaded media. Exactly one — see
 * the `comments_target_xor` database constraint.
 *
 * Everything that used to take a `build` takes a target instead, so the comment
 * primitives (creation, edition, deletion, reactions, thread resolution, live
 * events, notifications) are written once and work for all three.
 */
export type CommentTarget =
  | { type: "build"; build: Build }
  | { type: "test"; test: Test }
  | { type: "media"; media: Media };

/** The target columns to persist on a comment row. */
export function getCommentTargetColumns(target: CommentTarget): {
  buildId: string | null;
  testId: string | null;
  mediaId: string | null;
} {
  switch (target.type) {
    case "build":
      return { buildId: target.build.id, testId: null, mediaId: null };
    case "test":
      return { buildId: null, testId: target.test.id, mediaId: null };
    case "media":
      return { buildId: null, testId: null, mediaId: target.media.id };
    default:
      assertNever(target);
  }
}

/**
 * Whether a comment belongs to a target. Used to scope a comment lookup to the
 * routed build/test so a comment id can never be operated on through another
 * target.
 */
export function isCommentOnTarget(
  comment: Comment,
  target: CommentTarget,
): boolean {
  const columns = getCommentTargetColumns(target);
  return (
    comment.buildId === columns.buildId &&
    comment.testId === columns.testId &&
    comment.mediaId === columns.mediaId
  );
}

/**
 * The project a target belongs to, with its account fetched — the entry point
 * for permission checks and for anything that needs the project's slug/name.
 */
export async function getCommentTargetProject(
  target: CommentTarget,
): Promise<Project> {
  switch (target.type) {
    case "build": {
      const { build } = target;
      if (!build.project?.account) {
        await build.$fetchGraph("project.account");
      }
      invariant(build.project?.account, "Build project account not found");
      return build.project;
    }
    case "test": {
      const { test } = target;
      if (!test.project?.account) {
        await test.$fetchGraph("project.account");
      }
      invariant(test.project?.account, "Test project account not found");
      return test.project;
    }
    case "media": {
      const { media } = target;
      if (!media.project?.account) {
        await media.$fetchGraph("project.account");
      }
      invariant(media.project?.account, "Media project account not found");
      return media.project;
    }
    default:
      assertNever(target);
  }
}

/**
 * Resolve the target a stored comment was posted on. Used by the operations that
 * only get a comment (edit, delete, react, resolve) and still need the project
 * to authorize and the target to notify.
 */
export async function resolveCommentTarget(
  comment: Comment,
): Promise<CommentTarget> {
  if (comment.buildId) {
    const build = await Build.query()
      .findById(comment.buildId)
      .withGraphFetched("project.account");
    invariant(build, "Comment build not found");
    return { type: "build", build };
  }
  if (comment.testId) {
    const test = await Test.query()
      .findById(comment.testId)
      .withGraphFetched("project.account");
    invariant(test, "Comment test not found");
    return { type: "test", test };
  }
  invariant(comment.mediaId, "Comment has no target");
  const media = await Media.query()
    .findById(comment.mediaId)
    .withGraphFetched("project.account");
  invariant(media, "Comment media not found");
  return { type: "media", media };
}

/** URL of the page a target's comments are shown on. */
export async function getCommentTargetUrl(
  target: CommentTarget,
): Promise<string> {
  switch (target.type) {
    case "build":
      return target.build.getUrl();
    case "test":
      return target.test.getUrl();
    case "media":
      return target.media.url;
    default:
      assertNever(target);
  }
}

/**
 * Fields describing a target in a comment notification. Builds send their
 * number and name, tests and media send their name; the email copy picks the one
 * that is set.
 */
export function getCommentTargetNotificationFields(target: CommentTarget): {
  buildNumber?: number;
  buildName?: string | null;
  testName?: string;
  mediaName?: string;
} {
  switch (target.type) {
    case "build":
      return {
        buildNumber: target.build.number,
        buildName: target.build.name,
      };
    case "test":
      return { testName: target.test.name };
    case "media":
      return { mediaName: target.media.name };
    default:
      assertNever(target);
  }
}
