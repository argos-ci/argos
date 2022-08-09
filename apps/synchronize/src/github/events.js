/* eslint-disable default-case */
import logger from "@argos-ci/logger";
import { Purchase } from "@argos-ci/database/models";
import { getOrCreateInstallation } from "./synchronizer";
import {
  getActivePurchaseOrThrow,
  getOrCreateAccount,
  getOrCreatePurchase,
  getPlanOrThrow,
  synchronizeFromInstallationId,
} from "../helpers";

/**
 * Github marketplace purchase
 * Webhook doc : https://docs.github.com/en/enterprise-cloud@latest/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#marketplace_purchase
 * API doc : https://docs.github.com/en/enterprise-cloud@latest/developers/github-marketplace/using-the-github-marketplace-api-in-your-app/webhook-events-for-the-github-marketplace-api
 * Actions :
 * - purchased: plan purchase
 * - cancelled: plan cancel. The last billing cycle has ended
 * - pending_change: plan cancellation or downgrade that will take effect at the end of a billing cycle
 * - pending_change_cancelled: pending_change cancelled
 * - changed: immediate upgrade or downgrade plan
 */

export async function handleGitHubEvents({ name, payload }) {
  logger.info("GitHub event", name);
  try {
    switch (name) {
      case "marketplace_purchase": {
        switch (payload.action) {
          case "purchased": {
            const plan = await getPlanOrThrow(payload);
            const account = await getOrCreateAccount(payload);
            await getOrCreatePurchase({ account, plan });
            return;
          }
          case "changed":
          case "pending_change": {
            const nextPlan = await getPlanOrThrow(payload);
            const activePurchase = await getActivePurchaseOrThrow(payload);
            const swapDate =
              payload.action === "changed"
                ? new Date().toISOString()
                : payload.marketplace_purchase.next_billing_date;
            await Purchase.query()
              .patch({ endDate: swapDate })
              .findById(activePurchase.id);
            await Purchase.query().insert({
              planId: nextPlan.id,
              accountId: activePurchase.accountId,
              startDate: swapDate,
            });
            return;
          }
          case "pending_change_cancelled": {
            const activePurchase = await getActivePurchaseOrThrow(payload);
            await Purchase.query()
              .patch({ endDate: null })
              .findById(activePurchase.id);
            return;
          }
        }
        return;
      }
      case "installation_repositories": {
        switch (payload.action) {
          case "removed":
          case "added": {
            const installation = await getOrCreateInstallation({
              githubId: payload.installation.id,
              deleted: false,
            });
            await synchronizeFromInstallationId(installation.id);
            return;
          }
        }
        return;
      }
      case "installation": {
        switch (payload.action) {
          case "created": {
            const installation = await getOrCreateInstallation({
              githubId: payload.installation.id,
              deleted: false,
            });
            await synchronizeFromInstallationId(installation.id);
            return;
          }
          case "deleted": {
            const installation = await getOrCreateInstallation({
              githubId: payload.installation.id,
              deleted: true,
            });
            await synchronizeFromInstallationId(installation.id);
            return;
          }
        }
        return;
      }
    }
  } catch (error) {
    logger.error(error);
    console.error(error);
  }
}
