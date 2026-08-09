import { expect } from "@playwright/test";

import { createMediaScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("media share page", async ({ page, auth, project }) => {
  const media = await createMediaScenario({
    projectId: project.id,
    commentAuthorId: auth.user.id,
  });

  await page.goto(`/m/${media.after.shareToken}`);

  // The file name is the page's title, in the header. It also appears inside
  // the Share panel's Markdown embed, hence the heading role.
  await expect(
    page.getByRole("heading", { name: "checkout.png" }),
  ).toBeVisible();
  await expect(page.getByText("375×720")).toBeVisible();
  // Two uploads, so the version is worth naming.
  await expect(page.getByText("v2")).toBeVisible();
  // A pair, so both halves are on the page and the alt text distinguishes them.
  await expect(
    page.getByRole("img", { name: "checkout.png (before)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "checkout.png (after)" }),
  ).toBeVisible();
  // The pane label (uppercased by CSS, so the DOM text is the raw state).
  await expect(page.getByText("before", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Argos" })).toBeVisible();

  // Two threads, one of them pinned to a point on the image — the pin is a
  // floating marker on the image itself.
  await expect(page.getByRole("heading", { name: "Comments 2" })).toBeVisible();
  await expect(
    page.getByText("The primary button is misaligned here."),
  ).toBeVisible();
  await expect(
    page.getByText("Agreed — it should align with the input above."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Open comment from/ }),
  ).toBeVisible();

  await screenshot(page, "media-share-page");
});

loggedTest(
  "pins a comment to a point on the image",
  async ({ page, auth, project }) => {
    const media = await createMediaScenario({
      projectId: project.id,
      commentAuthorId: auth.user.id,
    });

    await page.goto(`/m/${media.after.shareToken}`);

    await page.getByRole("button", { name: "Pin a comment" }).click();
    await expect(
      page.getByText("Click the spot on the image you want to comment on."),
    ).toBeVisible();

    // The pin lands wherever the reviewer points, stored as a fraction of the
    // media's own box, and the composer floats right beside it — the same
    // flow as the build's screenshot comments.
    await page
      .getByRole("button", { name: "Pick the spot to comment on" })
      .click({ position: { x: 200, y: 150 } });

    const draftDialog = page.getByRole("dialog", { name: "Add a comment" });
    const editor = draftDialog.getByLabel("Add a comment");
    await editor.click();
    await editor.fill("This spacing is off by a few pixels.");
    await draftDialog
      .getByRole("button", { name: "Submit the comment" })
      .click();

    // The created thread opens beside its marker, and the sidebar lists it
    // too — the comment is on both surfaces.
    await expect(
      page.getByText("This spacing is off by a few pixels."),
    ).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: /^Open comment from/ }),
    ).toHaveCount(2);
    await expect(page.getByText("pinned on the image")).toHaveCount(2);
  },
);

loggedTest("media share page for a video", async ({ page, project }) => {
  const media = await createMediaScenario({
    projectId: project.id,
  });

  await page.goto(`/m/${media.video.shareToken}`);

  await expect(
    page.getByRole("heading", { name: "checkout-flow.mp4" }),
  ).toBeVisible();
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

loggedTest("media pull request list", async ({ page, auth, team, project }) => {
  await createMediaScenario({
    projectId: project.id,
    commentAuthorId: auth.user.id,
    withPullRequest: true,
  });

  await page.goto(`/${team.account.slug}/~/pull-requests`);

  await expect(
    page.getByRole("heading", { name: "Pull requests" }),
  ).toBeVisible();

  // The pull request is the row, and it links out to GitHub.
  const pr = page.getByRole("link", { name: "Tighten the checkout spacing" });
  await expect(pr).toBeVisible();
  await expect(pr).toHaveAttribute("href", /github\.com/);
  await expect(page.getByText("#1234")).toBeVisible();

  // A thumbnail per media, linking to its share page.
  await expect(
    page.getByRole("link", { name: "checkout.png (before)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "checkout.png (after)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "checkout-flow.mp4" }),
  ).toBeVisible();

  // Uploaded by hand rather than by a test run, so there is no build to link.
  await expect(page.getByText("No Argos build")).toBeVisible();

  await screenshot(page, "media-pull-request-list");
});

loggedTest(
  "media pull request list is empty without media",
  async ({ page, team }) => {
    await page.goto(`/${team.account.slug}/~/pull-requests`);
    await expect(
      page.getByRole("heading", { name: "No media yet" }),
    ).toBeVisible();
  },
);
