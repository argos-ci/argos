import { describe, expect, test } from "vitest";

import { Account, type Plan, type Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { claimOverageAlert } from "./overage-alert";

const INCLUDED_SCREENSHOTS = 1000;
const ADDITIONAL_SCREENSHOT_PRICE = 0.5;

type Ctx = {
  plan: Plan;
  /** Team on a usage based plan, without a spend limit. */
  account: Account;
  /** Project of the team, with the included screenshots already used up. */
  project: Project;
};

const withUsageBasedTeam = test.extend<Ctx>({
  plan: async ({}, use) => {
    await setupDatabase();
    const plan = await factory.Plan.create({ usageBased: true });
    await use(plan);
  },
  account: async ({ plan }, use) => {
    const account = await factory.TeamAccount.create();
    const subscriber = await factory.User.create();
    await factory.Subscription.create({
      accountId: account.id,
      planId: plan.id,
      includedScreenshots: INCLUDED_SCREENSHOTS,
      currency: "usd",
      additionalScreenshotPrice: ADDITIONAL_SCREENSHOT_PRICE,
      additionalStorybookScreenshotPrice: ADDITIONAL_SCREENSHOT_PRICE,
      provider: "stripe",
      stripeSubscriptionId: "sub_overage",
      subscriberId: subscriber.id,
      startDate: new Date("2021-01-01").toISOString(),
    });
    await use(account);
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({ accountId: account.id });
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      screenshotCount: INCLUDED_SCREENSHOTS,
    });
    await use(project);
  },
});

/** Take enough additional screenshots to add `amount` to the period's cost. */
async function spend(project: Project, amount: number) {
  await factory.ScreenshotBucket.create({
    projectId: project.id,
    screenshotCount: amount / ADDITIONAL_SCREENSHOT_PRICE,
  });
}

/**
 * Claim from a freshly loaded account, as the build job does: the subscription
 * manager caches the cost on the instance.
 */
async function claim(account: Account) {
  const fresh = await Account.query().findById(account.id).throwIfNotFound();
  return claimOverageAlert(fresh);
}

async function getLastThreshold(account: Account) {
  const fresh = await Account.query().findById(account.id).throwIfNotFound();
  return fresh.lastOverageAlertThreshold;
}

describe("claimOverageAlert", () => {
  withUsageBasedTeam(
    "claims nothing below the first threshold",
    async ({ account, project }) => {
      await spend(project, 199.5);
      await expect(claim(account)).resolves.toBeNull();
      await expect(getLastThreshold(account)).resolves.toBeNull();
    },
  );

  withUsageBasedTeam(
    "claims a threshold once",
    async ({ account, project }) => {
      await spend(project, 200);
      await expect(claim(account)).resolves.toEqual({
        threshold: 200,
        currency: "usd",
      });
      await expect(getLastThreshold(account)).resolves.toBe(200);
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withUsageBasedTeam(
    "claims the next threshold as the cost grows",
    async ({ account, project }) => {
      await spend(project, 200);
      await expect(claim(account)).resolves.toEqual({
        threshold: 200,
        currency: "usd",
      });
      await spend(project, 300);
      await expect(claim(account)).resolves.toEqual({
        threshold: 500,
        currency: "usd",
      });
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withUsageBasedTeam(
    "claims only the highest threshold when several are reached at once",
    async ({ account, project }) => {
      await spend(project, 600);
      await expect(claim(account)).resolves.toEqual({
        threshold: 500,
        currency: "usd",
      });
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withUsageBasedTeam(
    "leaves accounts with a spend limit to the spend limit alerts",
    async ({ account, project }) => {
      await account.$query().patch({ meteredSpendLimitByPeriod: 1000 });
      await spend(project, 600);
      await expect(claim(account)).resolves.toBeNull();
      await expect(getLastThreshold(account)).resolves.toBeNull();
    },
  );

  withUsageBasedTeam(
    "claims nothing when a spend limit is set after the account was loaded",
    async ({ account, project }) => {
      await spend(project, 600);
      const loaded = await Account.query()
        .findById(account.id)
        .throwIfNotFound();
      await account.$query().patch({ meteredSpendLimitByPeriod: 1000 });
      await expect(claimOverageAlert(loaded)).resolves.toBeNull();
      await expect(getLastThreshold(account)).resolves.toBeNull();
    },
  );

  withUsageBasedTeam(
    "lets a single concurrent run claim a threshold",
    async ({ account, project }) => {
      await spend(project, 200);
      const alerts = await Promise.all([claim(account), claim(account)]);
      expect(alerts.filter((alert) => alert !== null)).toHaveLength(1);
    },
  );

  withUsageBasedTeam(
    "claims nothing on a flat-rate plan",
    async ({ plan, account, project }) => {
      await plan.$query().patch({ usageBased: false });
      await spend(project, 600);
      await expect(claim(account)).resolves.toBeNull();
    },
  );
});
