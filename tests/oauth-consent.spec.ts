import { expect } from "@playwright/test";

import { OAuthGrant } from "../apps/backend/src/database/models";
import { createOAuthClient } from "../apps/backend/src/database/seeds";
import {
  OAUTH_SCOPE_LIST,
  serializeScopes,
} from "../apps/backend/src/oauth/scopes";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getUniqueTestIdentifier, screenshot } from "./util";

const REDIRECT_URI = "http://localhost:4001/callback";
/** A syntactically valid S256 challenge; the consent screen only forwards it. */
const CODE_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

const consentTest = loggedTest.extend<{ authorizeUrl: string }>({
  authorizeUrl: async ({ user, team }, use, testInfo) => {
    await ensureTeamOwner({ team: team.team, user: user.user });
    const client = await createOAuthClient({
      clientId: `argos-cli-${getUniqueTestIdentifier(testInfo)}`,
      redirectUris: [REDIRECT_URI],
      knownAppId: "argos-cli",
    });
    const params = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      // Request every scope so the screen offers every preset.
      scope: serializeScopes(OAUTH_SCOPE_LIST),
      code_challenge: CODE_CHALLENGE,
      code_challenge_method: "S256",
    });
    await use(`/oauth/authorize?${params.toString()}`);
  },
});

consentTest("oauth consent screen", async ({ page, authorizeUrl }) => {
  await page.goto(authorizeUrl);
  await expect(
    page.getByRole("heading", { name: "Authorize Argos CLI" }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Read and write" }),
  ).toBeChecked();
  await screenshot(page, "oauth-consent");

  await page.getByRole("radio", { name: "Custom" }).click();
  // Every scope resource must render a titled group — a resource missing from
  // the frontend's SCOPE_GROUPS map falls back to its raw key (e.g. "media").
  for (const label of [
    "Profile",
    "Projects",
    "Builds",
    "Reviews",
    "Comments",
    "Media",
    "Organization",
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await screenshot(page, "oauth-consent-custom");
});

consentTest(
  "oauth consent grants the chosen preset and remembers it",
  async ({ page, authorizeUrl, user }) => {
    await page.route(`${REDIRECT_URI}?*`, (route) =>
      route.fulfill({ contentType: "text/plain", body: "Authorized" }),
    );
    await page.goto(authorizeUrl);
    await page.getByRole("radio", { name: "Read only" }).click();
    await page.getByRole("button", { name: "Authorize Argos CLI" }).click();
    await page.waitForURL(`${REDIRECT_URI}?*`);

    const grant = await OAuthGrant.query()
      .findOne({ userId: user.user.id })
      .throwIfNotFound();
    expect(grant.scopes).toEqual([
      "profile",
      "projects:read",
      "comments:read",
      "media:read",
    ]);

    await page.goto(authorizeUrl);
    await expect(page.getByRole("radio", { name: "Read only" })).toBeChecked();
  },
);
