import { expect } from "@playwright/test";

import { TeamUser } from "../apps/backend/src/database/models";
import { createInvoicesScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("account invoices - billing history", async ({ page, team }) => {
  await createInvoicesScenario({ accountId: team.account.id });

  await page.goto(`/${team.account.slug}/~/invoices`);

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
  await page.keyboard.press("Escape");

  await screenshot(page, "account-invoices");
});

loggedTest(
  "account invoices - reachable from billing settings",
  async ({ page, team }) => {
    await createInvoicesScenario({ accountId: team.account.id });

    await page.goto(`/${team.account.slug}/settings/billing`);
    await page.getByRole("link", { name: "View invoices" }).click();

    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/${team.account.slug}/~/invoices`),
    );
  },
);

loggedTest(
  "account invoices - members cannot read them",
  async ({ page, team, auth }) => {
    await createInvoicesScenario({ accountId: team.account.id });
    await TeamUser.query()
      .patch({ userLevel: "member" })
      .where({ teamId: team.team.id, userId: auth.user.id });

    await page.goto(`/${team.account.slug}/~/invoices`);

    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  },
);
