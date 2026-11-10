import { captureException } from "@sentry/node";

import type { Account } from "@/database/models";
import {
  claimPlanLimitAlert,
  releasePlanLimitAlert,
} from "@/database/services/plan-limit-alert";

import { sendNotification } from ".";

/**
 * Tell the owners of an account on a flat-rate plan that it is about to run
 * out of screenshots, or that it ran out and its builds are now rejected.
 *
 * Called from the capacity checks of build creation and media upload: the
 * account's subscription manager has already loaded the usage it reads, so it
 * costs no query until an alert is due. The warning reached by a build is sent
 * at the next build or upload, and the rejection alert at the first one that
 * is rejected.
 *
 * Never throws: the email is a side effect of the build or upload, and must
 * not fail it.
 */
export async function sendPlanLimitAlert(account: Account): Promise<void> {
  try {
    const claim = await claimPlanLimitAlert(account);
    if (claim === null) {
      return;
    }
    try {
      const ownerIds = await account.$getOwnerIds();
      // SCIM offboarding can leave a team without an owner: nobody to tell.
      if (ownerIds.length === 0) {
        return;
      }
      await sendNotification({
        type: "plan_limit",
        data: {
          accountType: account.type,
          accountName: account.name,
          accountSlug: account.slug,
          ...claim.alert,
        },
        recipients: ownerIds,
      });
    } catch (error) {
      await releasePlanLimitAlert(account, claim);
      throw error;
    }
  } catch (error) {
    captureException(error);
  }
}
