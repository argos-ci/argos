import {
  Account,
  Build,
  BuildNotificationSubscription,
  GithubPullRequest,
  User,
} from "@/database/models";

import {
  autoSubscribeUser,
  getSubscribedUserIds,
  subscribeUser,
  unsubscribeUser,
} from "./notification-subscription";

/**
 * Get the Argos User linked to a GitHub account, if any.
 */
async function getUserFromGithubAccount(
  githubAccountId: string,
): Promise<User | null> {
  const account = await Account.query()
    .findOne({ githubAccountId })
    .whereNotNull("userId");
  if (!account?.userId) {
    return null;
  }
  const user = await User.query().findById(account.userId);
  return user ?? null;
}

/**
 * Subscribe a user to a build's notifications.
 * The user explicitly opts in; clears any previous unsubscription.
 */
export async function subscribeUserToBuild(input: {
  buildId: string;
  userId: string;
}): Promise<void> {
  await subscribeUser(BuildNotificationSubscription, input);
}

/**
 * Unsubscribe a user from a build's notifications.
 * Records an intentional unsubscription.
 */
export async function unsubscribeUserFromBuild(input: {
  buildId: string;
  userId: string;
}): Promise<void> {
  await unsubscribeUser(BuildNotificationSubscription, input);
}

/**
 * Automatically subscribe a user to a build, unless they have intentionally
 * unsubscribed.
 */
export async function autoSubscribeUserToBuild(input: {
  buildId: string;
  userId: string;
}): Promise<void> {
  await autoSubscribeUser(BuildNotificationSubscription, input);
}

/**
 * Get the user IDs currently subscribed to a build's notifications.
 *
 * These are the users who asked to be told, not the users who may still read
 * what they would be told about — see `getCommentRecipients`.
 */
export async function getBuildSubscribedUserIds(
  buildId: string,
): Promise<string[]> {
  return getSubscribedUserIds(BuildNotificationSubscription, { buildId });
}

/**
 * Auto-subscribe the pull request creator to a build, if the creator is linked
 * to an Argos user and they have not intentionally unsubscribed.
 */
export async function subscribeBuildPullRequestCreator(input: {
  buildId: string;
  pullRequest: GithubPullRequest;
}): Promise<void> {
  const { buildId, pullRequest } = input;
  if (!pullRequest.creatorId) {
    return;
  }
  const user = await getUserFromGithubAccount(pullRequest.creatorId);
  if (!user) {
    return;
  }
  await autoSubscribeUserToBuild({ buildId, userId: user.id });
}

/**
 * Auto-subscribe the pull request creator to every build linked to this pull
 * request. Used when the creator becomes known after the builds were created.
 */
export async function subscribePullRequestCreatorToAllBuilds(
  pullRequest: GithubPullRequest,
): Promise<void> {
  if (!pullRequest.creatorId) {
    return;
  }
  const user = await getUserFromGithubAccount(pullRequest.creatorId);
  if (!user) {
    return;
  }
  const builds = await Build.query()
    .select("id")
    .where({ githubPullRequestId: pullRequest.id });
  for (const build of builds) {
    await autoSubscribeUserToBuild({ buildId: build.id, userId: user.id });
  }
}
