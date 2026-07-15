import { invariant } from "@argos/util/invariant";

import type { AuthOAuthPayload, AuthPATPayload } from "@/auth/payload";
import { getCommentThreadRoot } from "@/comment/thread";
import { Build, Comment, type User } from "@/database/models";
import { boom } from "@/util/error";

import { assertProjectAccess } from "./project";

/** Project permissions checked by the review/comment endpoints. */
type BuildActionPermission = "view" | "review" | "review_dismiss";

/**
 * Load the build addressed by `{owner}/{project}/builds/{buildNumber}` for a
 * user caller (personal access token or OAuth), enforcing the rules shared by
 * every review/comment endpoint: the token must be scoped to the owner account,
 * and the build must exist. These routes accept a PAT or an OAuth token, so the
 * global handler resolves and type-checks the auth; pass `req.ctx.auth()` and
 * the build load runs in parallel with authentication.
 *
 * Returns the resolved auth and the build (with `project.account` fetched so
 * callers can check permissions and serialize without a second round-trip).
 */
export async function loadBuildForUserAuth(
  authPromise: Promise<AuthPATPayload | AuthOAuthPayload>,
  params: { owner: string; project: string; buildNumber: number },
): Promise<{ auth: AuthPATPayload | AuthOAuthPayload; build: Build }> {
  const [auth, build] = await Promise.all([
    authPromise,
    Build.query()
      .joinRelated("project.account")
      .where("project:account.slug", params.owner)
      .where("project.name", params.project)
      .where("number", params.buildNumber)
      .withGraphFetched("project.account")
      .first(),
  ]);

  assertProjectAccess(auth, {
    projectId: build?.projectId ?? null,
    account: { slug: params.owner },
  });

  if (!build) {
    throw boom(404, "Not found");
  }

  invariant(build.project?.account, "Build project account not found");

  return { auth, build };
}

/**
 * Assert the user holds a project permission on the build's project, throwing a
 * 403 with the given message otherwise. The build must have `project` fetched
 * (as returned by {@link loadBuildForUserAuth}).
 */
export async function assertBuildPermission(input: {
  build: Build;
  user: User;
  permission: BuildActionPermission;
  message: string;
}): Promise<void> {
  const { build, user, permission, message } = input;
  invariant(build.project, "Build project not fetched");
  const permissions = await build.project.$getPermissions(user);
  if (!permissions.includes(permission)) {
    throw boom(403, message);
  }
}

/**
 * Load a comment by id, scoped to a build: a comment whose id is unknown or
 * belongs to a different build surfaces as a clean 404 rather than leaking
 * across builds. Soft-deleted comments are returned as-is — callers decide
 * whether a deleted comment is meaningful for their action (mirroring the
 * GraphQL resolvers).
 */
export async function getBuildComment(input: {
  commentId: string;
  buildId: string;
}): Promise<Comment> {
  const comment = await Comment.query().findById(input.commentId);
  if (!comment || comment.buildId !== input.buildId) {
    throw boom(404, "Comment not found");
  }
  return comment;
}

/**
 * Resolve the (non-deleted) root comment of the thread a comment belongs to,
 * scoped to a build. Thread-level actions (resolve, subscribe) operate on the
 * root regardless of which comment in the thread the caller referenced.
 */
export async function getBuildCommentThread(input: {
  commentId: string;
  buildId: string;
}): Promise<Comment> {
  const thread = await getCommentThreadRoot(input.commentId);
  if (!thread || thread.buildId !== input.buildId) {
    throw boom(404, "Thread not found");
  }
  return thread;
}
