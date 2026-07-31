import { invariant } from "@argos/util/invariant";

import type { AuthOAuthPayload, AuthPATPayload } from "@/auth/payload";
import {
  getCommentTargetProject,
  isCommentOnTarget,
  type CommentTarget,
} from "@/comment/target";
import { getCommentThreadRoot } from "@/comment/thread";
import { Comment, Test, type User } from "@/database/models";
import { boom } from "@/util/error";
import { safeParseTestId } from "@/util/test-id";

import { loadBuildForUserAuth, type BuildActionPermission } from "./build";
import { assertProjectAccess } from "./project";

/** The route params addressing a test's comments. */
type TestRouteParams = { owner: string; project: string; testId: string };

/**
 * The path params of a comment route. Comments live on a build or on a test, and
 * every comment endpoint is registered on both paths with a single
 * implementation, so the implementations take this union.
 */
export type CommentRouteParams =
  { owner: string; project: string; buildNumber: number } | TestRouteParams;

/** The auth accepted by every comment endpoint. */
export type CommentAuth = AuthPATPayload | AuthOAuthPayload;

/**
 * Load the test addressed by `{owner}/{project}/tests/{testId}` for a user
 * caller (personal access token or OAuth), with the same rules as
 * `loadBuildForUserAuth`: the token must be scoped to the owner account and the
 * test must exist. The public test id embeds the project name, so a test
 * addressed through another project's id resolves to a 404.
 */
async function loadTestForUserAuth(
  authPromise: Promise<CommentAuth>,
  params: TestRouteParams,
): Promise<{ auth: CommentAuth; test: Test }> {
  const parsed = safeParseTestId(params.testId);
  const [auth, test] = await Promise.all([
    authPromise,
    parsed
      ? Test.query()
          .joinRelated("project.account")
          .where("tests.id", parsed.testId)
          .where("project:account.slug", params.owner)
          .where("project.name", params.project)
          .withGraphFetched("project.account")
          .first()
      : null,
  ]);

  assertProjectAccess(auth, {
    projectId: test?.projectId ?? null,
    account: { slug: params.owner },
  });

  if (!test || test.project?.name.toUpperCase() !== parsed?.projectName) {
    throw boom(404, "Not found");
  }

  invariant(test.project?.account, "Test project account not found");

  return { auth, test };
}

/**
 * Load the comment target addressed by a route, whichever kind it is. Every
 * comment endpoint is registered on both a build path and a test path and shares
 * one implementation, so they all resolve their target through this.
 */
export async function loadCommentTargetForUserAuth(
  authPromise: Promise<CommentAuth>,
  params: CommentRouteParams,
): Promise<{ auth: CommentAuth; target: CommentTarget }> {
  if ("testId" in params) {
    const { auth, test } = await loadTestForUserAuth(authPromise, params);
    return { auth, target: { type: "test", test } };
  }
  const { auth, build } = await loadBuildForUserAuth(authPromise, params);
  return { auth, target: { type: "build", build } };
}

/**
 * Assert the user holds a project permission on the project a comment target
 * belongs to, throwing a 403 with the given message otherwise.
 */
export async function assertCommentTargetPermission(input: {
  target: CommentTarget;
  user: User;
  permission: BuildActionPermission;
  message: string;
}): Promise<void> {
  const { target, user, permission, message } = input;
  const project = await getCommentTargetProject(target);
  const permissions = await project.$getPermissions(user);
  if (!permissions.includes(permission)) {
    throw boom(403, message);
  }
}

/**
 * Load a comment by id, scoped to a target: a comment whose id is unknown or
 * belongs to a different build/test surfaces as a clean 404 rather than leaking
 * across targets. Soft-deleted comments are returned as-is — callers decide
 * whether a deleted comment is meaningful for their action (mirroring the
 * GraphQL resolvers).
 */
export async function getTargetComment(input: {
  commentId: string;
  target: CommentTarget;
}): Promise<Comment> {
  const comment = await Comment.query().findById(input.commentId);
  if (!comment || !isCommentOnTarget(comment, input.target)) {
    throw boom(404, "Comment not found");
  }
  return comment;
}

/**
 * Resolve the (non-deleted) root comment of the thread a comment belongs to,
 * scoped to a target. Thread-level actions (resolve, subscribe) operate on the
 * root regardless of which comment in the thread the caller referenced.
 */
export async function getTargetCommentThread(input: {
  commentId: string;
  target: CommentTarget;
}): Promise<Comment> {
  const thread = await getCommentThreadRoot(input.commentId);
  if (!thread || !isCommentOnTarget(thread, input.target)) {
    throw boom(404, "Thread not found");
  }
  return thread;
}
