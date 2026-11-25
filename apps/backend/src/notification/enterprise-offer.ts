import { captureException } from "@sentry/node";

import type { Account } from "@/database/models";
import {
  claimEnterpriseOffer,
  releaseEnterpriseOffer,
} from "@/database/services/enterprise-offer";

import { sendNotification } from ".";

/**
 * Offer an Enterprise plan to the owners and billing members of a team on Pro
 * whose running billing period just reached the threshold.
 *
 * The email is sent once per account, ever, so a claim that reached nobody is
 * given back: when the team has no one to tell yet, or the email could not be
 * queued, the next build or media upload tries again.
 *
 * Never throws: neither the build job nor the media upload that call it may
 * fail over an email, and the upload does not even await it.
 */
export async function sendEnterpriseOffer(account: Account): Promise<void> {
  try {
    const claim = await claimEnterpriseOffer(account);
    if (claim === null) {
      return;
    }
    try {
      const recipients = await account.$getUserIdsWithPermission("billing");
      // SCIM offboarding can leave a team without an owner: nobody to tell.
      if (recipients.length === 0) {
        await releaseEnterpriseOffer(account, claim);
        return;
      }
      await sendNotification({
        type: "enterprise_offer",
        data: { accountName: account.name, accountSlug: account.slug },
        recipients,
      });
    } catch (error) {
      await releaseEnterpriseOffer(account, claim);
      throw error;
    }
  } catch (error) {
    captureException(error);
  }
}
