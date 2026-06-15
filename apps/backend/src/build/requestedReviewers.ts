import { invariant } from "@argos/util/invariant";

import { knex } from "@/database";
import {
  Account,
  Build,
  BuildRequestedReviewer,
  User,
} from "@/database/models";
import { sendNotification } from "@/notification";
import { getProjectMemberIds } from "@/project/members";

/**
 * Resolve a list of public account ids to the database user ids of users who are
 * members of (have access to) the build's project. Account ids that don't map to
 * a user, or whose user isn't a project member, are dropped — the server-side
 * enforcement of "you can only request members as reviewers" (mirrors the
 * mention security in `src/comment/mentions.ts`).
 */
async function resolveEligibleReviewerUserIds(input: {
  build: Build;
  accountIds: string[];
}): Promise<string[]> {
  const { build, accountIds } = input;
  if (accountIds.length === 0) {
    return [];
  }
  const { project } = build;
  invariant(project, "Build project not found");
  const [accounts, memberIds] = await Promise.all([
    Account.query()
      .findByIds(accountIds)
      .whereNotNull("userId")
      .select("userId"),
    getProjectMemberIds(project).then((ids) => new Set(ids)),
  ]);
  const userIds = new Set<string>();
  for (const account of accounts) {
    if (account.userId && memberIds.has(account.userId)) {
      userIds.add(account.userId);
    }
  }
  return [...userIds];
}

/**
 * Request the given users (by public account id) to review a build. Idempotent:
 * users already requested are ignored (no duplicate, no second notification).
 * Newly-requested reviewers receive a `review_requested` notification.
 */
export async function addBuildReviewers(input: {
  build: Build;
  accountIds: string[];
  requestedById: string;
}): Promise<void> {
  const { build, accountIds, requestedById } = input;
  const userIds = (await resolveEligibleReviewerUserIds({ build, accountIds }))
    // You can't request yourself as a reviewer.
    .filter((userId) => userId !== requestedById);
  if (userIds.length === 0) {
    return;
  }

  // Insert atomically: `onConflict().ignore()` makes concurrent requests safe
  // and the returning rows tell us which reviewers were actually added, so we
  // notify each person only once. `createdAt`/`updatedAt` fall back to their
  // database defaults.
  const inserted = await knex("build_requested_reviewers")
    .insert(
      userIds.map((userId) => ({ buildId: build.id, userId, requestedById })),
    )
    .onConflict(["buildId", "userId"])
    .ignore()
    .returning("userId");

  const newReviewerIds = inserted.map((row) => row.userId as string);

  if (newReviewerIds.length > 0) {
    await notifyReviewersRequested({
      build,
      requestedById,
      recipients: newReviewerIds,
    });
  }
}

/**
 * Cancel the review requests for the given users (by public account id) on a
 * build. Removing a reviewer that wasn't requested is a no-op.
 */
export async function removeBuildReviewers(input: {
  build: Build;
  accountIds: string[];
}): Promise<void> {
  const { build, accountIds } = input;
  if (accountIds.length === 0) {
    return;
  }
  const accounts = await Account.query()
    .findByIds(accountIds)
    .whereNotNull("userId")
    .select("userId");
  const userIds = accounts
    .map((account) => account.userId)
    .filter((userId): userId is string => userId != null);
  if (userIds.length === 0) {
    return;
  }
  await BuildRequestedReviewer.query()
    .delete()
    .where("buildId", build.id)
    .whereIn("userId", userIds);
}

/**
 * Notify the newly-requested reviewers that their review was requested. The
 * requester is never notified of their own request.
 */
async function notifyReviewersRequested(input: {
  build: Build;
  requestedById: string;
  recipients: string[];
}): Promise<void> {
  const { build, requestedById, recipients } = input;
  if (recipients.length === 0) {
    return;
  }
  const { project } = build;
  invariant(project?.account, "project account not found");
  const [requester, buildUrl] = await Promise.all([
    User.query().findById(requestedById).withGraphFetched("account"),
    build.getUrl(),
  ]);
  const requesterName = requester?.account?.displayName ?? null;
  await sendNotification({
    type: "review_requested",
    data: {
      accountSlug: project.account.slug,
      projectName: project.name,
      buildNumber: build.number,
      buildName: build.name,
      buildUrl,
      requesterName,
    },
    recipients,
  });
}
