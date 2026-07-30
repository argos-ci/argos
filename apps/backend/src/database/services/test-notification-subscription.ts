import { TestNotificationSubscription } from "@/database/models";

/**
 * Subscribe a user to a test's notifications.
 * The user explicitly opts in; clears any previous unsubscription.
 */
export async function subscribeUserToTest(input: {
  testId: string;
  userId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await TestNotificationSubscription.query()
    .insert({
      testId: input.testId,
      userId: input.userId,
      subscribedAt: now,
    })
    .onConflict(["testId", "userId"])
    .merge({
      subscribedAt: now,
      unsubscribedAt: null,
      updatedAt: now,
    });
}

/**
 * Unsubscribe a user from a test's notifications.
 * Records an intentional unsubscription.
 */
export async function unsubscribeUserFromTest(input: {
  testId: string;
  userId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await TestNotificationSubscription.query()
    .insert({
      testId: input.testId,
      userId: input.userId,
      unsubscribedAt: now,
    })
    .onConflict(["testId", "userId"])
    .merge({
      unsubscribedAt: now,
      updatedAt: now,
    });
}

/**
 * Automatically subscribe a user to a test, unless they have intentionally
 * unsubscribed.
 */
export async function autoSubscribeUserToTest(input: {
  testId: string;
  userId: string;
}): Promise<void> {
  const existing = await TestNotificationSubscription.query().findOne({
    testId: input.testId,
    userId: input.userId,
  });
  if (existing?.isIntentionallyUnsubscribed()) {
    return;
  }
  await subscribeUserToTest(input);
}

/**
 * Get the user IDs currently subscribed to a test's notifications.
 */
export async function getTestSubscribedUserIds(
  testId: string,
): Promise<string[]> {
  const subscriptions = await TestNotificationSubscription.query()
    .select("userId")
    .where({ testId })
    .whereNotNull("subscribedAt")
    .where((qb) =>
      qb
        .whereNull("unsubscribedAt")
        .orWhereRaw('"subscribedAt" > "unsubscribedAt"'),
    );
  return subscriptions.map((s) => s.userId);
}
