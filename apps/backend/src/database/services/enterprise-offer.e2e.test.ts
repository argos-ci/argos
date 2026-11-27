import { describe, expect, test } from "vitest";

import {
  Plan,
  Subscription,
  type Account,
  type Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getIsEnterpriseOfferShown } from "./enterprise-offer";

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
      includedScreenshots: INCLUDED_SCREENSHOTS,
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

  withProTeam(
    "is hidden during a trial, which Stripe does not bill",
    async ({ account, subscription, project }) => {
      await subscription.$query().patch({
        status: "trialing",
        trialEndDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      });
      await bill(project, 5000);
      await expect(getIsEnterpriseOfferShown(account)).resolves.toBe(false);
    },
  );

  withProTeam(
    "leaves out a team with a negotiated screenshot price",
    async ({ account, subscription, project }) => {
      await subscription.$query().patch({ additionalScreenshotPrice: 0.002 });
      // 700,000 screenshots past the quota at $0.002, plus the $100 plan.
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        screenshotCount: 700_000,
      });
      await expect(getIsEnterpriseOfferShown(account)).resolves.toBe(false);
    },
  );

  withProTeam(
    "leaves out a team with a negotiated Storybook screenshot price",
    async ({ account, subscription, project }) => {
      await subscription
        .$query()
        .patch({ additionalStorybookScreenshotPrice: 0.001 });
      await bill(project, 1500);
      await expect(getIsEnterpriseOfferShown(account)).resolves.toBe(false);
    },
  );

  withProTeam(
    "compares a team billed in euros at the revenue rate",
    async ({ account, subscription, project }) => {
      // $1,500 is €1,282.50 at the fixed rate.
      await subscription.$query().patch({ currency: "eur" });
      await bill(project, 1280);
      await expect(getIsEnterpriseOfferShown(account)).resolves.toBe(false);
      // Ten more euros of overage: the period comes to €1,290.
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        screenshotCount: 10 / ADDITIONAL_SCREENSHOT_PRICE,
      });
      await expect(getIsEnterpriseOfferShown(account)).resolves.toBe(true);
    },
  );
});
