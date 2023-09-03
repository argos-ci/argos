/* eslint-disable default-case */
import type { EmitterWebhookEvent } from "@octokit/webhooks";

import { getPendingCommentBody } from "@argos-ci/database";
import {
  GithubPullRequest,
  GithubRepository,
  Purchase,
} from "@argos-ci/database/models";
import { commentGithubPr, getInstallationOctokit } from "@argos-ci/github";
import logger from "@argos-ci/logger";

import { synchronizeFromInstallationId } from "../helpers.js";
import {
  cancelPurchase,
  getAccount,
  getGithubPlan,
  getOrCreateAccountFromEvent,
  getOrCreateInstallation,
} from "./eventHelpers.js";
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
            const [plan, account] = await Promise.all([
              getGithubPlan(payload),
              getOrCreateAccountFromEvent(payload),
            ]);

            const activePurchase = await account.$getActivePurchase();
            if (activePurchase && activePurchase.planId === plan.id) return;

            await Purchase.query().insert({
              accountId: account.id,
              planId: plan.id,
              startDate: payload.effective_date,
              source: "github",
              trialEndDate: payload.marketplace_purchase.free_trial_ends_on,
            });
            return;
          }
          case "changed": {
            const account = await getAccount(payload);
            if (!account) {
              logger.error(
                "Cannot update purchase, account not found",
                payload,
              );
              return;
            }
            await updatePurchase(payload, account);
            return;
          }
          case "cancelled": {
            const account = await getAccount(payload);
            if (!account) {
              logger.error(
                "Cannot cancel purchase, account not found",
                payload,
              );
              return;
            }
            await cancelPurchase(payload, account);
            return;
          }
        }
        return;
      }
      case "repository": {
        switch (payload.action) {
          case "deleted":
          case "edited":
          case "privatized":
          case "publicized":
          case "transferred":
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
      case "pull_request": {
        if (payload.action === "synchronize") {
          if (!payload.installation) return;

          const repository = await GithubRepository.query().findOne({
            githubId: payload.repository.id,
          });

          if (!repository) return;

          const pr = await GithubPullRequest.query()
            .findOne({
              githubRepositoryId: repository.id,
              number: payload.pull_request.number,
            })
            .whereNotNull("commentId");

          if (!pr || !pr.commentId) return;

          const installation = await getOrCreateInstallation({
            githubId: payload.installation.id,
            deleted: false,
          });

          const octokit = await getInstallationOctokit(installation.id);

          if (!octokit) {
            return;
          }

          await commentGithubPr({
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            octokit,
            body: getPendingCommentBody(),
            pullRequest: pr,
          });

          return;
        }
        return;
      }
    }
  } catch (error) {
    logger.error(error);
  }
};
