import { CommentNotificationSubscription } from "@/database/models";

import {
  getSubscribedUserIds,
  subscribeUser,
  unsubscribeUser,
} from "./notification-subscription";

export async function subscribeUserToCommentThread(input: {
  commentId: string;
  userId: string;
}): Promise<void> {
  await subscribeUser(CommentNotificationSubscription, input);
}

export async function unsubscribeUserFromCommentThread(input: {
  commentId: string;
  userId: string;
}): Promise<void> {
  await unsubscribeUser(CommentNotificationSubscription, input);
}

/**
 * Get the user IDs currently subscribed to a comment thread.
 *
 * These are the users who asked to be told, not the users who may still read
 * what they would be told about — see `getCommentRecipients`.
 */
export async function getCommentThreadSubscribedUserIds(
  commentId: string,
): Promise<string[]> {
  return getSubscribedUserIds(CommentNotificationSubscription, { commentId });
}
