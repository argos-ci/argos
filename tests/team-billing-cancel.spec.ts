import { expect } from "@playwright/test";

import { Account, Subscription } from "../apps/backend/src/database/models";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

/**
 * Put the team on a real Stripe subscription.
 *
 * The fixture team is on a forced plan, which the plan card reads as a contract
 * we bill by hand — so the cancellation controls only appear once Stripe is
 * actually behind the plan.
 */
async function subscribeToStripe(input: {
  accountId: string;
  planId: string;
  subscriberId: string;
  slug: string;
}) {
  await Account.query()
    .findById(input.accountId)
    .patch({ forcedPlanId: null, stripeCustomerId: `cus_${input.slug}` });
  await Subscription.query().insert({
    planId: input.planId,
    accountId: input.accountId,
    provider: "stripe",
    stripeSubscriptionId: `sub_${input.slug}`,
    subscriberId: input.subscriberId,
    startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    endDate: null,
    paymentMethodFilled: true,
    status: "active",
  });
}

loggedTest(
  "team billing - cancelation asks why, and offers a call on price",
  async ({ page, team, auth, plan }) => {
    await subscribeToStripe({
      accountId: team.account.id,
      planId: plan.id,
      subscriberId: auth.user.id,
      slug: team.account.slug,
    });

    await page.goto(`/${team.account.slug}/settings/billing`);
    await page.getByRole("button", { name: "Cancel subscription" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Cancel subscription" }),
    ).toBeVisible();
    await screenshot(page, "cancel-subscription-survey");

    // Neither picked nor written: the survey asks again rather than letting the
    // cancelation through with no reason at all.
    await dialog.getByRole("button", { name: "Cancel subscription" }).click();
    await expect(
      dialog.getByText("Tell us why, from the list or in your own words."),
    ).toBeVisible();

    // "Other" is the one choice that cannot stand on its own.
    await dialog.getByLabel("Why are you leaving?").click();
    await page.getByRole("option", { name: "Other", exact: true }).click();
    await dialog.getByRole("button", { name: "Cancel subscription" }).click();
    await expect(
      dialog.getByText("Tell us what went wrong so we can fix it."),
    ).toBeVisible();

    await dialog.getByLabel("Why are you leaving?").click();
    await page.getByRole("option", { name: "It costs too much" }).click();

    // Price is the one answer that opens an offer, and it opens in place: no
    // extra screen between the leaver and the way out.
    await expect(dialog.getByText("Before you go")).toBeVisible();
    await expect(
      dialog.getByText("The price is usually something we can work on"),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "book a 15-minute call" }),
    ).toHaveCount(1);
    await screenshot(page, "cancel-subscription-price-offer");
  },
);

loggedTest(
  "team billing - a scheduled cancelation can be called off",
  async ({ page, team, auth, plan }) => {
    await subscribeToStripe({
      accountId: team.account.id,
      planId: plan.id,
      subscriberId: auth.user.id,
      slug: team.account.slug,
    });
    await Subscription.query()
      .patch({
        endDate: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
      })
      .where({ accountId: team.account.id });

    await page.goto(`/${team.account.slug}/settings/billing`);

    // The card announces the date the plan stops on instead of a payment that
    // will never be taken.
    await expect(
      page.getByText("Your subscription is canceled."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Resume subscription" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel subscription" }),
    ).toHaveCount(0);
  },
);
