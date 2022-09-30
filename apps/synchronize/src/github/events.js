/* eslint-disable default-case */
import logger from "@argos-ci/logger";
import { getOrCreateInstallation } from "./synchronizer";
import { synchronizeFromInstallationId } from "../helpers";
import {
  getOrCreateAccount,
  getNewPlanOrThrow,
  cancelPurchase,
} from "./eventHelpers";
import { Purchase } from "@argos-ci/database/models";
import { updatePurchase } from "./updatePurchase";

export async function handleGitHubEvents({ name, payload }) {
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
            await Purchase.query().insert({
              accountId: account.id,
              planId: newPlan.id,
              startDate: payload.effective_date,
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
  }
}
