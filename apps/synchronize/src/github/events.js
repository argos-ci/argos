/* eslint-disable default-case */
import logger from "@argos-ci/logger";
import { getOrCreateInstallation } from "./synchronizer";
import { synchronizeFromInstallationId } from "../helpers";
import { purchase } from "./marketplaceEvents/purchase";
import { change } from "./marketplaceEvents/change";
import { pendingChangeCancel } from "./marketplaceEvents/pendingChangeCancel";
import { cancel } from "./marketplaceEvents/cancel";

export async function handleGitHubEvents({ name, payload }) {
  logger.info("GitHub event", name);
  try {
    switch (name) {
      case "marketplace_purchase": {
        switch (payload.action) {
          case "purchased": {
            await purchase(payload);
            return;
          }
          case "changed":
          case "pending_change": {
            await change(payload);
            return;
          }
          case "cancelled": {
            await cancel(payload);
            return;
          }
          case "pending_change_cancelled": {
            await pendingChangeCancel(payload);
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
