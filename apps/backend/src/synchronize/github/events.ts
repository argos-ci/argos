/* eslint-disable default-case */
import type { EmitterWebhookEvent } from "@octokit/webhooks";

import { getPendingCommentBody } from "@/database/index.js";
import {
  GithubPullRequest,
  GithubRepository,
  Subscription,
} from "@/database/models/index.js";
import { commentGithubPr, getInstallationOctokit } from "@/github/index.js";
import logger from "@/logger/index.js";

import { synchronizeFromInstallationId } from "../helpers.js";
import {
  cancelSubscription,
  getAccount,
  getGithubPlan,
  getOrCreateAccountFromEvent,
  getOrCreateInstallation,
} from "./eventHelpers.js";
import { updateSubscription } from "./updateSubscription.js";

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

            const manager = account.$getSubscriptionManager();
            const activeSubscription = await manager.getActiveSubscription();
            if (activeSubscription && activeSubscription.planId === plan.id) {
              return;
            }

            await Subscription.query().insert({
              accountId: account.id,
              planId: plan.id,
              startDate: payload.effective_date,
              provider: "github",
              trialEndDate: payload.marketplace_purchase.free_trial_ends_on,
              status: "active",
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
            await updateSubscription(payload, account);
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
            await cancelSubscription(payload, account);
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
        if (
          ![
            "closed",
            "edited",
            "reopened",
            "synchronize",
            "ready_for_review",
            "converted_to_draft",
          ].includes(payload.action)
        ) {
          return;
        }

        const repository = await GithubRepository.query().findOne({
          githubId: payload.repository.id,
        });

        if (!repository) return;

        const pr = await GithubPullRequest.query().findOne({
          githubRepositoryId: repository.id,
          number: payload.pull_request.number,
        });

        if (!pr) return;

        if (
          [
            "closed",
            "edited",
            "reopened",
            "ready_for_review",
            "converted_to_draft",
          ].includes(payload.action)
        ) {
          await pr
            .$clone()
            .$query()
            .patch({
              title: payload.pull_request.title,
              baseRef: payload.pull_request.base.ref,
              baseSha: payload.pull_request.base.sha,
              state: payload.pull_request.state,
              date: payload.pull_request.created_at,
              closedAt: payload.pull_request.closed_at ?? null,
              mergedAt: payload.pull_request.merged_at ?? null,
              merged: payload.pull_request.merged,
              draft: payload.pull_request.draft,
            });
          return;
        }

        if (payload.action === "synchronize" && pr.commentId) {
          if (!payload.installation) return;
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
        }

        return;
      }
    }
  } catch (error) {
    logger.error(error);
  }
};
