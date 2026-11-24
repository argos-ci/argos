import { describe, expect, test } from "vitest";

import { Account, Plan, Subscription, type Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  claimEnterpriseOffer,
  getIsEnterpriseOfferShown,
} from "./enterprise-offer";

const INCLUDED_SCREENSHOTS = 1000;
const ADDITIONAL_SCREENSHOT_PRICE = 0.5;
const FLAT_PRICE = 100;

type Ctx = {
  /** Team on the Pro plan since 2021, so its periods reset on the 1st. */
  account: Account;
  subscription: Subscription;
  /** Project of the team, with the included screenshots already used up. */
  project: Project;
};

const withProTeam = test.extend<Ctx>({
  account: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create();
    const plan = await factory.Plan.create({
      name: "pro",
      usageBased: true,
      interval: "month",
    });
    const subscriber = await factory.User.create();
    await factory.Subscription.create({
      accountId: account.id,
      planId: plan.id,
      includedScreenshots: INCLUDED_SCREENSHOTS,
      currency: "usd",
      flatPrice: FLAT_PRICE,
      additionalScreenshotPrice: ADDITIONAL_SCREENSHOT_PRICE,
      additionalStorybookScreenshotPrice: ADDITIONAL_SCREENSHOT_PRICE,
      provider: "stripe",
      stripeSubscriptionId: "sub_enterprise_offer",
      subscriberId: subscriber.id,
      createdAt: new Date("2021-01-01").toISOString(),
      startDate: new Date("2021-01-01").toISOString(),
      status: "active",
    });
    await use(account);
  },
  subscription: async ({ account }, use) => {
    const subscription = await Subscription.query()
      .findOne({ accountId: account.id })
      .throwIfNotFound();
    await use(subscription);
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

/** Move the team off Pro, keeping everything else about its subscription. */
async function leavePro(subscription: Subscription) {
  await Plan.query()
    .findById(subscription.planId)
    .patch({ name: "enterprise" });
}

/** Bring the running period's bill, plan included, to `amount`. */
async function bill(project: Project, amount: number) {
  await factory.ScreenshotBucket.create({
    projectId: project.id,
    screenshotCount: (amount - FLAT_PRICE) / ADDITIONAL_SCREENSHOT_PRICE,
  });
}

/**
 * Claim from a freshly loaded account, as the build job does: the subscription
 * manager caches the usage on the instance.
 */
async function claim(account: Account) {
  const fresh = await Account.query().findById(account.id).throwIfNotFound();
  return claimEnterpriseOffer(fresh);
}

async function getSentAt(account: Account) {
  const fresh = await Account.query().findById(account.id).throwIfNotFound();
  return fresh.enterpriseOfferSentAt;
}

describe("claimEnterpriseOffer", () => {
  withProTeam(
    "claims nothing below the threshold",
    async ({ account, project }) => {
      await bill(project, 1499.5);
      await expect(claim(account)).resolves.toBe(false);
      await expect(getSentAt(account)).resolves.toBeNull();
    },
  );

  withProTeam(
    "claims the offer once, when the period reaches the threshold",
    async ({ account, project }) => {
      await bill(project, 1500);
      await expect(claim(account)).resolves.toBe(true);
      await expect(getSentAt(account)).resolves.not.toBeNull();
      await bill(project, 3000);
      await expect(claim(account)).resolves.toBe(false);
    },
  );

  withProTeam(
    "claims nothing on another plan",
    async ({ account, subscription, project }) => {
      await leavePro(subscription);
      await bill(project, 5000);
      await expect(claim(account)).resolves.toBe(false);
    },
  );

  withProTeam(
    "claims nothing during a trial, which Stripe does not bill",
    async ({ account, subscription, project }) => {
      await subscription.$query().patch({ status: "trialing" });
      await bill(project, 5000);
      await expect(claim(account)).resolves.toBe(false);
    },
  );
});

describe("getIsEnterpriseOfferShown", () => {
  withProTeam("is hidden below the threshold", async ({ account, project }) => {
    await bill(project, 1499.5);
    await expect(getIsEnterpriseOfferShown(account)).resolves.toBe(false);
  });

  withProTeam(
    "shows while the running period is over the threshold",
    async ({ account, project }) => {
      await bill(project, 1500);
      await expect(getIsEnterpriseOfferShown(account)).resolves.toBe(true);
    },
  );

  withProTeam(
    "stays up the period after one that was over the threshold",
    async ({ account, project }) => {
      const now = new Date();
      const inPreviousPeriod = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        2,
      );
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        createdAt: inPreviousPeriod.toISOString(),
        screenshotCount:
          INCLUDED_SCREENSHOTS +
          (1500 - FLAT_PRICE) / ADDITIONAL_SCREENSHOT_PRICE,
      });
      await expect(getIsEnterpriseOfferShown(account)).resolves.toBe(true);
    },
  );

  withProTeam(
    "is hidden once the team left the Pro plan",
    async ({ account, subscription, project }) => {
      await leavePro(subscription);
      await bill(project, 5000);
      await expect(getIsEnterpriseOfferShown(account)).resolves.toBe(false);
    },
  );
});
