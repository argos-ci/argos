import { expect, type Page } from "@playwright/test";

import { TeamInvite } from "../apps/backend/src/database/models";
import { loggedTest } from "./logged-test";
import { getUniqueTestIdentifier, screenshot } from "./util";

/**
 * The pages no other spec captures, each once, so that a change to their
 * layout shows in Argos, at a phone's width too (see `screenshot`). A few
 * pages per test: enough to share a viewer, few enough to run in parallel.
 */

type Viewer = { account: { slug: string }; user: { email: string | null } };

/**
 * The viewer's slug and email, and a team's slug, are unique per test, so
 * Argos is shown fixed ones. Only those the page shows: `screenshot` fails on
 * a text it cannot find.
 */
async function maskViewer(
  page: Page,
  auth: Viewer,
  others: Record<string, string> = {},
) {
  const candidates: Record<string, string> = {
    ...others,
    [auth.account.slug]: "kyle",
  };
  if (auth.user.email) {
    candidates[auth.user.email] = "kyle@acme.com";
  }
  const replacements: Record<string, string> = {};
  // Longest first: the email holds the slug, so the slug must still show once
  // the email is replaced, outside of it.
  const searches = Object.keys(candidates).sort((a, b) => b.length - a.length);
  for (const [index, search] of searches.entries()) {
    const outside = searches
      .slice(0, index)
      .filter((longer) => longer.startsWith(search))
      .map((longer) => `(?!${escapeRegExp(longer.slice(search.length))})`)
      .join("");
    const text = new RegExp(`${escapeRegExp(search)}${outside}`);
    if (await page.getByText(text).first().isVisible()) {
      replacements[search] = candidates[search] as string;
    }
  }
  return { replacements };
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function visit(page: Page, path: string, ready: () => Promise<void>) {
  await page.goto(path);
  await ready();
}

loggedTest("personal projects and settings", async ({ page, auth }) => {
  const slug = auth.account.slug;
  await visit(page, `/${slug}`, () =>
    expect(
      page.getByRole("heading", { name: "Create your first project" }),
    ).toBeVisible(),
  );
  await screenshot(page, "personal-projects", await maskViewer(page, auth));

  await visit(page, `/${slug}/settings`, () =>
    expect(
      page.getByRole("heading", { name: "Personal Settings" }),
    ).toBeVisible(),
  );
  // An input's value is not text the replacements reach.
  await page
    .getByRole("region", { name: "Your Username" })
    .getByRole("textbox", { name: "URL namespace", exact: true })
    .fill("kyle");
  await screenshot(
    page,
    "personal-settings-general",
    await maskViewer(page, auth),
  );

  await visit(page, `/${slug}/settings/authentication`, () =>
    expect(page.getByText("Sessions", { exact: true })).toBeVisible(),
  );
  await screenshot(
    page,
    "personal-settings-authentication",
    await maskViewer(page, auth),
  );
});

loggedTest("personal settings sections", async ({ page, auth }) => {
  const slug = auth.account.slug;
  const sections = [
    { id: "billing", ready: () => page.getByRole("heading", { name: "Plan" }) },
    {
      id: "notifications",
      ready: () => page.getByText("Notifications", { exact: true }).last(),
    },
    {
      id: "tokens",
      // The section's link reads the same: the card's title comes after it.
      ready: () => page.getByText("Tokens", { exact: true }).last(),
    },
    {
      id: "applications",
      ready: () => page.getByText("Authorized applications"),
    },
  ];
  for (const section of sections) {
    await visit(page, `/${slug}/settings/${section.id}`, () =>
      expect(section.ready()).toBeVisible(),
    );
    await screenshot(
      page,
      `personal-settings-${section.id}`,
      await maskViewer(page, auth),
    );
  }
});

loggedTest("teams, new team and welcome", async ({ page, auth }) => {
  await visit(page, "/teams", () => expect(page).toHaveTitle(/Teams/));
  await screenshot(page, "teams", await maskViewer(page, auth));

  await visit(page, "/teams/new", () =>
    expect(page.getByRole("heading", { name: "Create a Team" })).toBeVisible(),
  );
  await screenshot(page, "new-team", await maskViewer(page, auth));

  await visit(page, "/~/welcome", () =>
    expect(
      page.getByRole("heading", { name: "Welcome to Argos" }),
    ).toBeVisible(),
  );
  await screenshot(page, "welcome", await maskViewer(page, auth));
});

loggedTest("links from emails and the CLI", async ({ page, auth }) => {
  await visit(page, "/verify", () =>
    expect(page.getByText("Invalid verification link")).toBeVisible(),
  );
  await screenshot(page, "verify-email-invalid", await maskViewer(page, auth));

  await visit(page, "/account/delete?token=a-deletion-token", () =>
    expect(page).toHaveTitle(/Confirm Account Deletion/),
  );
  await screenshot(
    page,
    "account-delete-confirm",
    await maskViewer(page, auth),
  );

  await visit(page, "/auth/cli?port=4242&state=a-state&pkce=a-challenge", () =>
    expect(page).toHaveTitle(/Authorize CLI/),
  );
  await screenshot(page, "auth-cli", await maskViewer(page, auth));

  await visit(page, "/this/page/does/not/exist", () =>
    expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible(),
  );
  await screenshot(page, "not-found", await maskViewer(page, auth));
});

loggedTest("team invites", async ({ page, auth, team }, testInfo) => {
  // Not a member yet: a member is sent straight to the team.
  const mask = () => maskViewer(page, auth, { [team.account.slug]: "acme" });

  // The team's own link, shared by hand.
  const link = new URL(await team.team.$getInviteLink());
  await visit(page, link.pathname, () => expect(page).toHaveTitle(/Join/));
  await expect(page.getByRole("button", { name: /Join/ })).toBeVisible();
  await screenshot(page, "team-invite-link", await mask());

  // An invitation sent by email, only valid for the address it went to.
  const secret =
    `${getUniqueTestIdentifier(testInfo)}aaaaaaaaaaaaaaaaaaaa`.slice(0, 20);
  await TeamInvite.query().insert({
    email: auth.user.email ?? "kyle@acme.com",
    teamId: team.team.id,
    userLevel: "member",
    invitedById: auth.user.id,
    secret,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  });
  await visit(page, `/invites/${secret}`, () =>
    expect(page).toHaveTitle(/Join/),
  );
  await expect(page.getByRole("button", { name: /Join|Accept/ })).toBeVisible();
  await screenshot(page, "team-invite-email", await mask());
});
