import { TestNotificationSubscription } from "@/database/models";

import {
  autoSubscribeUser,
  getSubscribedUserIds,
  subscribeUser,
  unsubscribeUser,
} from "./notification-subscription";

/**
 * Subscribe a user to a test's notifications.
 * The user explicitly opts in; clears any previous unsubscription.
 */
export async function subscribeUserToTest(input: {
  testId: string;
  userId: string;
}): Promise<void> {
  await subscribeUser(TestNotificationSubscription, input);
}

/**
 * Unsubscribe a user from a test's notifications.
 * Records an intentional unsubscription.
 */
export async function unsubscribeUserFromTest(input: {
  testId: string;
  userId: string;
}): Promise<void> {
  await unsubscribeUser(TestNotificationSubscription, input);
}

/**
 * Automatically subscribe a user to a test, unless they have intentionally
 * unsubscribed.
 */
export async function autoSubscribeUserToTest(input: {
  testId: string;
  userId: string;
}): Promise<void> {
  await autoSubscribeUser(TestNotificationSubscription, input);
}

/**
 * Get the user IDs currently subscribed to a test's notifications.
 *
 * These are the users who asked to be told, not the users who may still read
 * what they would be told about — see `getCommentRecipients`.
 */
export async function getTestSubscribedUserIds(
  testId: string,
): Promise<string[]> {
  return getSubscribedUserIds(TestNotificationSubscription, { testId });
}
