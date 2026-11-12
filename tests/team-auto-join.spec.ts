import { expect } from "@playwright/test";

import { TeamDomain, UserEmail } from "../apps/backend/src/database/models";
import { loggedTest } from "./logged-test";
import { getUniqueTestIdentifier, screenshot } from "./util";

loggedTest(
  "a signup creating a team is offered the team matching its email domain",
  async ({ page, auth, team }, testInfo) => {
    // A domain of its own: every seeded user is on acme.com, and the specs run
    // in parallel against one database.
    const domain = `${getUniqueTestIdentifier(testInfo)}.acme.test`;
    const email = `kyle@${domain}`;
    await Promise.all([
      UserEmail.query().insert({
        email,
        userId: auth.user.id,
        verified: true,
      }),
      TeamDomain.query().insert({ teamId: team.team.id, domain }),
    ]);

    // Where signup sends someone who picked team projects.
    await page.goto("/teams/new?name=Gryffindor&autoSubmit=true");
    await expect(
      page.getByRole("heading", {
        name: "Your colleagues are already on Argos",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Gryffindor" }),
    ).toBeVisible();
    await screenshot(page, "join-or-create-team", {
      // The email first: it holds the domain.
      replacements: { [email]: "kyle@acme.com", [domain]: "acme.com" },
    });

    await page.getByRole("button", { name: "Join", exact: true }).click();
    // Creating the team is what asks the welcome questions, so joining instead
    // has to ask them on its way to the team.
    await expect(
      page.getByRole("heading", { name: "Welcome to Argos" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page).toHaveURL(new RegExp(`/${team.account.slug}$`));
  },
);
