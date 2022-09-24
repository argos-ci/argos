/* eslint-disable default-case */
import logger from "@argos-ci/logger";
import { getOrCreateInstallation } from "./synchronizer";
import { synchronizeFromInstallationId } from "../helpers";
import {
  getAccountOrThrow,
  getActivePurchaseOrThrow,
  getOrCreateAccount,
  getNewPlanOrThrow,
} from "./eventHelpers";
import { Purchase } from "@argos-ci/database/models";
import { transaction } from "@argos-ci/database";

export async function handleGitHubEvents({ name, payload }) {
  logger.info("GitHub event", name);
  try {
    switch (name) {
      case "marketplace_purchase": {
        switch (payload.action) {
          case "purchased": {
            const plan = await getNewPlanOrThrow(payload);
            const account = await getOrCreateAccount(payload);
            await Purchase.query().insert({
              accountId: account.id,
              planId: plan.id,
              startDate: payload.effective_date,
            });
            return;
          }
          case "changed": {
            const newPlan = await getNewPlanOrThrow(payload);
            const account = await getAccountOrThrow(payload);
            const purchase = await getActivePurchaseOrThrow(account);
            transaction(async (trx) => {
              await Promise.all(() => [
                Purchase.query(trx)
                  .patch({ endDate: payload.effective_date })
                  .findById(purchase.id),
                Purchase.query(trx).insert({
                  accountId: account.id,
                  planId: newPlan.id,
                  startDate: payload.effective_date,
                }),
              ]);
            });
            return;
          }
          case "cancelled": {
            const account = await getAccountOrThrow(payload);
            const purchase = await getActivePurchaseOrThrow(account);
            await Purchase.query()
              .findById(purchase.id)
              .patch({ endDate: payload.effective_date });
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
