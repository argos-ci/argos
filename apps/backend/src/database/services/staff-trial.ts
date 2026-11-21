import { invariant } from "@argos/util/invariant";

import { Account, Subscription, TeamUser } from "../models";

/**
 * The owner a trial started by staff is taken out in the name of: whoever
 * subscribed the team last, as long as they still own it, else its
 * longest-standing owner. Null when the team has no owner.
 *
 * Never the staff member who starts it. The subscriber is who the trial counts
 * against — a user who already had one is sent to checkout on their next team
 * instead of getting another.
 */
export async function getStaffTrialSubscriber(
  teamAccount: Account,
): Promise<Account | null> {
  invariant(teamAccount.teamId, "not a team account");

  const [owners, lastSubscription] = await Promise.all([
    TeamUser.query()
      .where({ teamId: teamAccount.teamId, userLevel: "owner" })
      .orderBy("createdAt")
      .orderBy("id"),
    Subscription.query()
      .where("accountId", teamAccount.id)
      .whereNotNull("subscriberId")
      .orderBy("createdAt", "desc")
      .first(),
  ]);

  const owner =
    owners.find((owner) => owner.userId === lastSubscription?.subscriberId) ??
    owners[0];

  if (!owner) {
    return null;
  }

  return Account.query().findOne({ userId: owner.userId }).throwIfNotFound();
}
