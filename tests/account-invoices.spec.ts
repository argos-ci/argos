import { expect } from "@playwright/test";

import { Plan, TeamUser } from "../apps/backend/src/database/models";
import { createInvoicesScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("account invoices - billing history", async ({ page, team }) => {
  await createInvoicesScenario({ accountId: team.account.id });

  await page.goto(`/${team.account.slug}/settings/invoices`);

  await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();

  // Most recent first, with what tells them apart: the month, the number the
  // customer's accounting quotes, whether it is settled, and the amount.
  const rows = page.getByRole("row");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("August 2026");
  await expect(rows.first()).toContainText("ARGOS-0003");
  await expect(rows.first()).toContainText("Due");
  await expect(rows.first()).toContainText("€249.00");
  await expect(rows.nth(1)).toContainText("Paid");
  await expect(rows.nth(2)).toContainText("Void");

  // Before the menu is touched: a trigger left focused would freeze its own
  // hover state into the baseline.
  await screenshot(page, "account-invoices");

  // Both ways to the document itself hang off the row's menu.
  await page
    .getByRole("button", { name: "Invoice ARGOS-0002 actions" })
    .click();
  await expect(
    page.getByRole("option", { name: "View invoice" }),
  ).toHaveAttribute("href", /invoice\.stripe\.com\/i\/in_[^/]+$/);
  await expect(
    page.getByRole("option", { name: "Download PDF" }),
  ).toHaveAttribute("href", /pdf$/);
});

loggedTest(
  "account invoices - reachable from the settings nav",
  async ({ page, team }) => {
    await createInvoicesScenario({ accountId: team.account.id });

    await page.goto(`/${team.account.slug}/settings`);
    await page.getByRole("link", { name: "Invoices" }).click();

    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/${team.account.slug}/settings/invoices`),
    );
  },
);

loggedTest(
  "account invoices - no tab for a member, nor for a yearly contract",
  async ({ page, team, auth, plan }) => {
    await createInvoicesScenario({ accountId: team.account.id });

    // A yearly plan is a negotiated contract, invoiced by the sales side.
    await Plan.query().patch({ interval: "year" }).where("id", plan.id);
    await page.goto(`/${team.account.slug}/settings`);
    await expect(page.getByRole("link", { name: "Billing" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Invoices" })).toHaveCount(0);

    await Plan.query().patch({ interval: "month" }).where("id", plan.id);
    await TeamUser.query()
      .patch({ userLevel: "member" })
      .where({ teamId: team.team.id, userId: auth.user.id });

    await page.goto(`/${team.account.slug}/settings`);
    await expect(page.getByRole("link", { name: "Invoices" })).toHaveCount(0);
  },
);
