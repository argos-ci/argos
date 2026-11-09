import type { Account } from "@/database/models";
import { claimPlanLimitAlert } from "@/database/services/plan-limit";

import { sendNotification } from ".";

/**
 * Tell the owners of an account on a flat-rate plan that it is about to run
 * out of screenshots, or that it ran out and its builds are now rejected.
 */
export async function sendPlanLimitAlert(account: Account): Promise<void> {
  const alert = await claimPlanLimitAlert(account);
  if (alert === null) {
    return;
  }
  const ownerIds = await account.$getOwnerIds();
  await sendNotification({
    type: "plan_limit",
    data: {
      accountType: account.type,
      accountName: account.name,
      accountSlug: account.slug,
      ...alert,
    },
    recipients: ownerIds,
  });
}
