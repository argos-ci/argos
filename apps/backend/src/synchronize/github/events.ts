/* eslint-disable default-case */
import { invariant } from "@argos/util/invariant";
import type { EmitterWebhookEvent } from "@octokit/webhooks";

import { finalizePartialBuilds } from "@/build/partial.js";
import { getPendingCommentBody } from "@/database/index.js";
import {
  Account,
  GithubAccountMember,
  GithubInstallation,
  GithubPullRequest,
  GithubRepository,
  Subscription,
  Team,
  TeamUser,
} from "@/database/models/index.js";
import {
  getOrCreateGhAccount,
  getOrCreateGithubAccountMember,
  joinSSOTeams,
} from "@/database/services/account.js";
import { parsePullRequestData } from "@/github-pull-request/pull-request.js";
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

export async function handleGitHubEvents(
  app: GithubInstallation["app"],
  { name, payload }: EmitterWebhookEvent,
) {
  logger.info("GitHub event", name);
  switch (name) {
    case "marketplace_purchase": {
      if (app !== "main") {
        return;
      }
      switch (payload.action) {
        case "purchased": {
          const [plan, account] = await Promise.all([
            getGithubPlan(payload),
            // @ts-expect-error problem with Octokit types
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
            paymentMethodFilled: true,
            status: "active",
          });
          return;
        }
        case "changed": {
          const account = await getAccount(payload);
          if (!account) {
            logger.error("Cannot update purchase, account not found", payload);
            return;
          }
          await updateSubscription(payload, account);
          return;
        }
        case "cancelled": {
          const account = await getAccount(payload);
          if (!account) {
            logger.error("Cannot cancel purchase, account not found", payload);
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
              app,
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
            app,
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
            app,
            githubId: payload.installation.id,
            deleted: false,
          });
          await synchronizeFromInstallationId(installation.id);
          return;
        }
        case "deleted": {
          const installation = await getOrCreateInstallation({
            app,
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

      if (!repository) {
        return;
      }

      const pr = await GithubPullRequest.query().findOne({
        githubRepositoryId: repository.id,
        number: payload.pull_request.number,
      });

      if (!pr) {
        return;
      }

      if (
        [
          "closed",
          "edited",
          "reopened",
          "ready_for_review",
          "converted_to_draft",
        ].includes(payload.action)
      ) {
        invariant(payload.pull_request);
        await pr
          .$clone()
          .$query()
          .patch(parsePullRequestData(payload.pull_request));
        return;
      }

      if (payload.action === "synchronize" && pr.commentId) {
        if (!payload.installation) {
          return;
        }
        const installation = await getOrCreateInstallation({
          app,
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
    case "organization": {
      switch (payload.action) {
        case "renamed": {
          await getOrCreateGhAccount({
            githubId: payload.organization.id,
            login: payload.organization.login,
            type: "organization",
          });
          return;
        }
        case "member_added": {
          invariant(payload.membership.user);
          // Create both the organization and the member if they don't exist.
          const [orgGithubAccount, memberGithubAccount] = await Promise.all([
            getOrCreateGhAccount({
              githubId: payload.organization.id,
              login: payload.organization.login,
              type: "organization",
            }),
            getOrCreateGhAccount({
              githubId: payload.membership.user.id,
              login: payload.membership.user.login,
              type: "user",
              email: payload.membership.user.email,
              name: payload.membership.user.name,
            }),
          ]);

          // Create the relationship between the organization and the member.
          await getOrCreateGithubAccountMember({
            githubAccountId: orgGithubAccount.id,
            githubMemberId: memberGithubAccount.id,
          });

          // Join the member to the organization's teams if the member is already an Argos user.
          const memberAccount = await memberGithubAccount
            .$relatedQuery("account")
            .select("userId");
          if (memberAccount) {
            invariant(memberAccount.userId, "Expected account to have userId");
            // Not a bid deal to try to join all SSO teams
            await joinSSOTeams({
              githubAccountId: memberGithubAccount.id,
              userId: memberAccount.userId,
            });
          }

          return;
        }
        case "member_removed": {
          invariant(payload.membership.user);
          // Create both the organization and the member if they don't exist.
          const [orgGithubAccount, memberGithubAccount] = await Promise.all([
            getOrCreateGhAccount({
              githubId: payload.organization.id,
              login: payload.organization.login,
              type: "organization",
            }),
            getOrCreateGhAccount({
              githubId: payload.membership.user.id,
              login: payload.membership.user.login,
              type: "user",
              email: payload.membership.user.email,
              name: payload.membership.user.name,
            }),
          ]);

          await Promise.all([
            // Remove the relationship between the organization and the member.
            GithubAccountMember.query().delete().where({
              githubAccountId: orgGithubAccount.id,
              githubMemberId: memberGithubAccount.id,
            }),
            // Leave the organization's teams if the member is already an Argos user.
            (async () => {
              const memberAccount = await Account.query()
                .select("userId")
                .findOne("githubAccountId", memberGithubAccount.id);

              if (memberAccount) {
                invariant(
                  memberAccount.userId,
                  "Expected account to have userId",
                );
                await TeamUser.query()
                  .delete()
                  .whereNot("userLevel", "owner")
                  .where("userId", memberAccount.userId)
                  .whereIn(
                    "teamId",
                    Team.query()
                      .select("id")
                      .where("ssoGithubAccountId", orgGithubAccount.id),
                  );
              }
            })(),
          ]);

          return;
        }
      }
      return;
    }
    case "workflow_run": {
      switch (payload.action) {
        case "completed": {
          await finalizePartialBuilds({
            runId: String(payload.workflow_run.id),
            runAttempt: payload.workflow_run.run_attempt,
          });
          return;
        }
      }
      return;
    }
  }
}
