import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Project, Subscription } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import * as notification from "@/notification";
import { stripe } from "@/stripe";
import {
  ENDED_TRIAL_STRIPE_SUBSCRIPTION,
  TRIAL_STRIPE_PRODUCT_ID,
  TRIAL_STRIPE_SUBSCRIPTION_ID,
  TRIALING_STRIPE_SUBSCRIPTION,
} from "@/stripe/fixtures/trial-subscription";

import { createBuild } from "./createBuild";

describe("build", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createBuild", () => {
    let project: Project;

    beforeEach(async () => {
      const plan = await factory.Plan.create({});
      const account = await factory.TeamAccount.create({
        forcedPlanId: plan.id,
      });
      project = await factory.Project.create({
        accountId: account.id,
        githubRepositoryId: null,
      });
    });

    describe("with an over-capacity trialing subscription", () => {
      let trialProject: Project;
      let trialSubscription: Subscription;

      beforeEach(async () => {
        const [team, user, plan] = await Promise.all([
          factory.Team.create(),
          factory.User.create(),
          factory.Plan.create({
            usageBased: true,
            includedScreenshots: 10,
            stripeProductId: TRIAL_STRIPE_PRODUCT_ID,
          }),
        ]);
        const trialAccount = await factory.TeamAccount.create({
          teamId: team.id,
        });
        await factory.TeamUser.create({
          teamId: team.id,
          userId: user.id,
          userLevel: "owner",
        });
        trialSubscription = await factory.Subscription.create({
          accountId: trialAccount.id,
          planId: plan.id,
          subscriberId: user.id,
          provider: "stripe",
          stripeSubscriptionId: TRIAL_STRIPE_SUBSCRIPTION_ID,
          status: "trialing",
          paymentMethodFilled: true,
        });
        trialProject = await factory.Project.create({
          accountId: trialAccount.id,
          githubRepositoryId: null,
        });
        await factory.ScreenshotBucket.create({
          projectId: trialProject.id,
          complete: true,
          screenshotCount: 11,
        });
      });

      function createTrialBuild() {
        return createBuild({
          project: trialProject,
          prHeadCommit: null,
          prNumber: null,
          argosSdk: "@argos-ci/core@3.2.0",
          baseBranch: "main",
          baseCommit: null,
          commit: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
          branch: "main",
          runAttempt: null,
          runId: null,
          ciProvider: "github-actions",
          mode: "ci",
          buildName: null,
          parallel: null,
          parentCommits: null,
          skipped: null,
          mergeQueue: false,
          subset: false,
        });
      }

      it("ends the trial and creates the build", async () => {
        vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
          TRIALING_STRIPE_SUBSCRIPTION as Stripe.Response<Stripe.Subscription>,
        );
        const update = vi
          .spyOn(stripe.subscriptions, "update")
          .mockResolvedValue(
            ENDED_TRIAL_STRIPE_SUBSCRIPTION as Stripe.Response<Stripe.Subscription>,
          );
        const send = vi
          .spyOn(notification, "sendNotification")
          .mockResolvedValue(undefined);

        const build = await createTrialBuild();

        expect(build.id).toBeDefined();
        expect(update).toHaveBeenCalledWith(TRIAL_STRIPE_SUBSCRIPTION_ID, {
          trial_end: "now",
        });
        const subscription = await trialSubscription.$query();
        expect(subscription.status).toBe("active");
        expect(send).toHaveBeenCalledWith(
          expect.objectContaining({ type: "trial_ended" }),
        );
      });

      it("rejects the build when no payment method is filled", async () => {
        // Rejected mocks so a guard regression fails fast instead of calling
        // the live Stripe API.
        const update = vi
          .spyOn(stripe.subscriptions, "update")
          .mockRejectedValue(new Error("update must not be called"));
        vi.spyOn(stripe.subscriptions, "retrieve").mockRejectedValue(
          new Error("retrieve must not be called"),
        );
        await trialSubscription.$query().patch({ paymentMethodFilled: false });

        await expect(createTrialBuild()).rejects.toThrow(
          "You have reached the maximum screenshot capacity",
        );
        expect(update).not.toHaveBeenCalled();
      });
    });

    it("creates a build", async () => {
      const build = await createBuild({
        project,
        prHeadCommit: null,
        prNumber: null,
        argosSdk: "@argos-ci/core@3.2.0",
        baseBranch: "develop",
        baseCommit: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
        commit: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
        branch: "develop",
        runAttempt: null,
        runId: null,
        ciProvider: "github-actions",
        mode: "monitoring",
        buildName: null,
        parallel: { nonce: "15292349583-1" },
        parentCommits: [
          "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
          "2c3f6f060a936d915126bfed1a228e6fe59dfd3e",
          "42c96859db7b13177b0d70e4e42d10c8470de30e",
        ],
        skipped: null,
        mergeQueue: false,
        subset: false,
      });

      expect(build.baseBranch).toBe("develop");
      expect(build.parentCommits).toEqual([
        "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
        "2c3f6f060a936d915126bfed1a228e6fe59dfd3e",
        "42c96859db7b13177b0d70e4e42d10c8470de30e",
      ]);
    });

    it("creates merge queue pull request links", async () => {
      const githubRepository = await factory.GithubRepository.create();
      await project.$query().patch({ githubRepositoryId: githubRepository.id });

      const build = await createBuild({
        project,
        prHeadCommit: null,
        prNumber: 42,
        argosSdk: "@argos-ci/core@3.2.0",
        baseBranch: "main",
        baseCommit: null,
        commit: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
        branch: "gh-readonly-queue/main/pr-42",
        runAttempt: null,
        runId: null,
        ciProvider: "github-actions",
        mode: "ci",
        buildName: null,
        parallel: null,
        parentCommits: null,
        skipped: null,
        mergeQueue: true,
        mergeQueuePrNumbers: [5, 6, 5],
        subset: false,
      });

      const linkedPullRequests = await build
        .$relatedQuery("mergeQueueGhPullRequests")
        .withGraphFetched("githubPullRequest");

      expect(
        linkedPullRequests.map((pr) => pr.githubPullRequest?.number).sort(),
      ).toEqual([5, 6]);
    });

    it("rejects mergeQueuePrNumbers when mergeQueue is false", async () => {
      await expect(
        createBuild({
          project,
          prHeadCommit: null,
          prNumber: null,
          argosSdk: "@argos-ci/core@3.2.0",
          baseBranch: "main",
          baseCommit: null,
          commit: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
          branch: "main",
          runAttempt: null,
          runId: null,
          ciProvider: "github-actions",
          mode: "ci",
          buildName: null,
          parallel: null,
          parentCommits: null,
          skipped: null,
          mergeQueue: false,
          mergeQueuePrNumbers: [1, 2],
          subset: false,
        }),
      ).rejects.toThrow(
        "`mergeQueue` must be `true` when `mergeQueuePrNumbers` is provided",
      );
    });
  });
});
