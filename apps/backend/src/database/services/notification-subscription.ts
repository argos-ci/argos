import type { NotificationSubscription } from "@/database/util/notification-subscription";

/**
 * A notification-subscription model class: any table pairing a target column
 * with `userId` as its primary key.
 */
type SubscriptionModel = typeof NotificationSubscription & {
  new (): NotificationSubscription;
};

/**
 * The primary key of one subscription row, e.g. `{ buildId, userId }`. Matches
 * the model's own `idColumn`, which is also what an upsert conflicts on.
 */
type SubscriptionId = Record<string, string>;

/**
 * The operations shared by every notification subscription table. Builds, tests
 * and comment threads differ only in the column naming what is followed, so the
 * behaviour — in particular the "was this an intentional opt-out?" rule that
 * decides whether an auto-subscribe applies — lives here once.
 *
 * Each caller keeps a thin, well-named wrapper (`subscribeUserToBuild`, …) so
 * call sites read in terms of what they follow.
 */

/** Columns to conflict on: the table's own primary key. */
function conflictColumns(model: SubscriptionModel): string[] {
  const { idColumn } = model;
  return Array.isArray(idColumn) ? idColumn : [idColumn];
}

/**
 * Record an explicit opt-in, clearing any previous unsubscription.
 */
export async function subscribeUser(
  model: SubscriptionModel,
  id: SubscriptionId,
): Promise<void> {
  const now = new Date().toISOString();
  await model
    .query()
    .insert({ ...id, subscribedAt: now })
    .onConflict(conflictColumns(model))
    .merge({ subscribedAt: now, unsubscribedAt: null, updatedAt: now });
}

/**
 * Record an intentional unsubscription. `subscribedAt` is deliberately left in
 * place so a later auto-subscribe can tell this apart from "never subscribed".
 */
export async function unsubscribeUser(
  model: SubscriptionModel,
  id: SubscriptionId,
): Promise<void> {
  const now = new Date().toISOString();
  await model
    .query()
    .insert({ ...id, unsubscribedAt: now })
    .onConflict(conflictColumns(model))
    .merge({ unsubscribedAt: now, updatedAt: now });
}

/**
 * Subscribe a user as a side effect of them engaging (commenting, being
 * mentioned), unless they have intentionally unsubscribed before.
 */
export async function autoSubscribeUser(
  model: SubscriptionModel,
  id: SubscriptionId,
): Promise<void> {
  const existing = await model.query().findOne(id);
  if (existing?.isIntentionallyUnsubscribed()) {
    return;
  }
  await subscribeUser(model, id);
}

/**
 * The ids of the users currently subscribed to one target.
 */
export async function getSubscribedUserIds(
  model: SubscriptionModel,
  target: SubscriptionId,
): Promise<string[]> {
  const subscriptions = await model
    .query()
    .select("userId")
    .where(target)
    .whereNotNull("subscribedAt")
    .where((qb) =>
      qb
        .whereNull("unsubscribedAt")
        .orWhereRaw('"subscribedAt" > "unsubscribedAt"'),
    );
  return subscriptions.map((subscription) => subscription.userId);
}
