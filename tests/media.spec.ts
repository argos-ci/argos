import { expect } from "@playwright/test";

import { createMediaScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("team media library", async ({ page, team, project }) => {
  await createMediaScenario({
    accountId: team.account.id,
    projectId: project.id,
  });

  await page.goto(`/${team.account.slug}/~/media`);

  await expect(page.getByRole("heading", { name: "Media" })).toBeVisible();

  // The rows link to the share page, so the file name is the link text.
  await expect(
    page.getByRole("link", { name: "checkout-after.png" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "checkout-flow.mp4" }),
  ).toBeVisible();

  // Both copy actions are on every row: the link and the Markdown embed.
  await expect(page.getByRole("button", { name: "Copy link" })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Copy Markdown" })).toHaveCount(
    3,
  );

  await screenshot(page, "team-media-library");
});

loggedTest("team media library search", async ({ page, team, project }) => {
  await createMediaScenario({
    accountId: team.account.id,
    projectId: project.id,
  });

  await page.goto(`/${team.account.slug}/~/media`);
  await page.getByRole("textbox", { name: "Search media" }).fill("flow");

  await expect(
    page.getByRole("link", { name: "checkout-flow.mp4" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "checkout-after.png" }),
  ).toBeHidden();
});

loggedTest("media share page", async ({ page, team, project }) => {
  const media = await createMediaScenario({
    accountId: team.account.id,
    projectId: project.id,
  });

  await page.goto(`/m/${media.image.shareToken}`);

  // The file name in the status line is the page's title — the share page has no
  // heading and no header bar by design.
  await expect(page.getByText("checkout-after.png")).toBeVisible();
  await expect(page.getByText("1024×768")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "checkout-after.png" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Argos" })).toBeVisible();

  await screenshot(page, "media-share-page");
});

loggedTest("media share page for a video", async ({ page, team, project }) => {
  const media = await createMediaScenario({
    accountId: team.account.id,
    projectId: project.id,
  });

  await page.goto(`/m/${media.video.shareToken}`);

  await expect(page.getByText("checkout-flow.mp4")).toBeVisible();
  // Rendered in a player, with the CDN-derived poster as its still frame.
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("poster", /ik-thumbnail\.jpg/);
});

loggedTest("media share page for an unknown token", async ({ page }) => {
  // Expired, deleted, and never-valid all render the same state: telling them
  // apart would leak whether a token ever pointed at something.
  await page.goto("/m/does-not-exist");

  await expect(
    page.getByRole("heading", { name: "This media is no longer available" }),
  ).toBeVisible();

  await screenshot(page, "media-share-unavailable");
});
