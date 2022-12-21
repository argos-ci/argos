/* eslint-disable default-case */
import type { EmitterWebhookEvent } from "@octokit/webhooks";

import { Purchase } from "@argos-ci/database/models";
import logger from "@argos-ci/logger";

import { synchronizeFromInstallationId } from "../helpers.js";
import {
  cancelPurchase,
  getNewPlanOrThrow,
  getOrCreateAccount,
} from "./eventHelpers.js";
import { getOrCreateInstallation } from "./synchronizer.js";
import { updatePurchase } from "./updatePurchase.js";

export const handleGitHubEvents = async ({
  name,
  payload,
}: EmitterWebhookEvent) => {
  logger.info("GitHub event", name);
  try {
    switch (name) {
      case "marketplace_purchase": {
        switch (payload.action) {
          case "purchased": {
            const [newPlan, account] = await Promise.all([
              getNewPlanOrThrow(payload),
              getOrCreateAccount(payload),
            ]);
            const activePurchase = await account.getActivePurchase();
            if (activePurchase && activePurchase.planId === newPlan.id) return;

            await Purchase.query().insert({
              accountId: account.id,
              planId: newPlan.id,
              startDate: payload.effective_date,
              source: "github",
            });
            return;
          }
          case "changed": {
            const account = await getOrCreateAccount(payload);
            await updatePurchase(payload, account);
            return;
          }
          case "cancelled": {
            const account = await getOrCreateAccount(payload);
            await cancelPurchase(payload, account);
            return;
          }
        }
        return;
      }
      case "repository": {
        switch (payload.action) {
          case "renamed": {
            if (payload.installation?.id) {
              const installation = await getOrCreateInstallation({
                githubId: payload.installation.id,
              });
              await synchronizeFromInstallationId(installation.id);
            }
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
          default:
            return;
        }
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
  }
};
