import { expect } from "@playwright/test";

import {
  Account,
  Plan,
  ScreenshotBucket,
  Subscription,
} from "../apps/backend/src/database/models";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

const INCLUDED_SCREENSHOTS = 35_000;
const ADDITIONAL_SCREENSHOT_PRICE = 0.004;
const FLAT_PRICE = 100;

loggedTest(
  "team billing - offers Enterprise to a Pro team whose period reached $1,500",
  async ({ page, team, auth, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });

    // The fixture plan is a flat one, and the offer is about the overage a
    // usage-based Pro plan bills.
    const plan = await Plan.query().insertAndFetch({
      name: "pro",
      includedScreenshots: INCLUDED_SCREENSHOTS,
      githubPlanId: null,
      stripeProductId: null,
      usageBased: true,
      githubSsoIncluded: false,
      fineGrainedAccessControlIncluded: false,
      samlIncluded: false,
      interval: "month",
    });
    const { slug } = team.account;
    await Account.query()
      .findById(team.account.id)
      .patch({ forcedPlanId: null, stripeCustomerId: `cus_${slug}` });
    await Subscription.query().insert({
      planId: plan.id,
      accountId: team.account.id,
      provider: "stripe",
      stripeSubscriptionId: `sub_${slug}`,
      subscriberId: auth.user.id,
      startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      endDate: null,
      trialEndDate: null,
      paymentMethodFilled: true,
      status: "active",
      currency: "usd",
      flatPrice: FLAT_PRICE,
      includedScreenshots: INCLUDED_SCREENSHOTS,
      additionalScreenshotPrice: ADDITIONAL_SCREENSHOT_PRICE,
    });
    await ScreenshotBucket.query().insert({
      name: "default",
      commit: "029b662f3ae57bae7a215301067262c1e95bbc95",
      branch: "main",
      projectId: project.id,
      complete: true,
      valid: true,
      screenshotCount:
        INCLUDED_SCREENSHOTS +
        (1500 - FLAT_PRICE) / ADDITIONAL_SCREENSHOT_PRICE,
      storybookScreenshotCount: 0,
    });

    await page.goto(`/${slug}/settings/billing`);
    await expect(
      page.getByRole("heading", { name: "A better price for your volume" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Book a call" }),
    ).toHaveAttribute("href", "https://cal.com/jsfez");
    await screenshot(page, "team-billing-enterprise-offer");
  },
);
