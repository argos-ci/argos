import type { Account } from "@/database/models";
import { claimPlanLimitAlert } from "@/database/services/plan-limit";

import { sendNotification } from ".";

/**
 * Tell the owners of an account on a flat-rate plan that it is about to run
 * out of screenshots, or that it ran out and its builds are now rejected.
 *
 * Called from the capacity checks of build creation and media upload: the
 * account's subscription manager has already loaded the usage it reads, so it
 * costs no query until a threshold is due. A threshold crossed by a build is
 * announced at the next build or upload, and the 110% one at the first that is
 * rejected.
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
