import { CommentNotificationSubscription } from "@/database/models";

export async function subscribeUserToCommentThread(input: {
  commentId: string;
  userId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await CommentNotificationSubscription.query()
    .insert({
      commentId: input.commentId,
      userId: input.userId,
      subscribedAt: now,
    })
    .onConflict(["commentId", "userId"])
    .merge({
      subscribedAt: now,
      unsubscribedAt: null,
      updatedAt: now,
    });
}

export async function unsubscribeUserFromCommentThread(input: {
  commentId: string;
  userId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await CommentNotificationSubscription.query()
    .insert({
      commentId: input.commentId,
      userId: input.userId,
      unsubscribedAt: now,
    })
    .onConflict(["commentId", "userId"])
    .merge({
      unsubscribedAt: now,
      updatedAt: now,
    });
}

export async function getCommentThreadSubscribedUserIds(
  commentId: string,
): Promise<string[]> {
  const subscriptions = await CommentNotificationSubscription.query()
    .select("userId")
    .where({ commentId })
    .whereNotNull("subscribedAt")
    .where((qb) =>
      qb
        .whereNull("unsubscribedAt")
        .orWhereRaw('"subscribedAt" > "unsubscribedAt"'),
    );
  return subscriptions.map((subscription) => subscription.userId);
}
