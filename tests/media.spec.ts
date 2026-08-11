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
    withPullRequest: true,
  });

  await page.goto(`/m/${media.after.shareToken}`);

  // The file name is the page's title, in the header. It also appears inside
  // the Share panel's Markdown embed, hence the heading role.
  await expect(
    page.getByRole("heading", { name: "checkout.png" }),
  ).toBeVisible();
  await expect(page.getByText("375×1024")).toBeVisible();
  // Two uploads, so the versions get their own panel — one row per upload
  // (the activity timeline also says "v2 uploaded").
  await expect(page.getByRole("heading", { name: "Versions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^v2/ })).toBeVisible();
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
  // The pull request this media was published to, in the header — the same
  // widget the build header uses. Only ever rendered for a viewer with access
  // to the project, which this logged-in owner has.
  await expect(
    page.getByRole("link", { name: /Tighten the checkout spacing/ }),
  ).toBeVisible();

  // Everything else uploaded to the same pull request, in a sidebar: three
  // rows, because the pair counts once.
  const sidebar = page.getByRole("region", { name: "Pull request media" });
  await expect(sidebar.locator("[aria-current]")).toHaveCount(1);
  await expect(sidebar.getByText("checkout.png")).toBeVisible();
  await expect(sidebar.getByText("dashboard.png")).toBeVisible();
  await expect(sidebar.getByText("checkout-flow.mp4")).toBeVisible();

  // Two threads, one of them pinned to a point on the image — the pin is a
  // floating marker on the image itself, and the panel tells the media's
  // whole story.
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
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
  "navigates the pull request's media with the sidebar and the keyboard",
  async ({ page, project }) => {
    // Uploaded oldest first: dashboard.png (07:00), the checkout.png pair
    // (08:00), then checkout-flow.mp4 (09:30).
    const media = await createMediaScenario({
      projectId: project.id,
      withPullRequest: true,
    });

    await page.goto(`/m/${media.after.shareToken}`);

    const sidebar = page.getByRole("region", { name: "Pull request media" });
    const previous = page
      .getByRole("main")
      .locator("button:has(.lucide-arrow-up)");
    const next = page
      .getByRole("main")
      .locator("button:has(.lucide-arrow-down)");
    await expect(previous).toBeVisible();
    await expect(next).toBeVisible();

    // Up from the pair reaches the lone screenshot, which is the first upload —
    // so there is nothing before it.
    await page.keyboard.press("ArrowUp");
    await expect(page).toHaveURL(`/m/${media.solo.shareToken}`);
    await expect(
      page.getByRole("heading", { name: "dashboard.png" }),
    ).toBeVisible();
    await expect(previous).toBeDisabled();

    // Down twice: back through the pair and on to the recording. A video used
    // to render no toolbar at all, which took the arrows and the name with it.
    //
    // Waiting for the name between the two presses, not just the URL: the next
    // media is still being fetched when the URL changes, and the arrows are
    // deliberately shut while it is.
    await page.keyboard.press("ArrowDown");
    await expect(page).toHaveURL(`/m/${media.after.shareToken}`);
    await expect(
      page.getByRole("heading", { name: "checkout.png" }),
    ).toBeVisible();
    await expect(next).toBeEnabled();
    await page.keyboard.press("ArrowDown");
    await expect(page).toHaveURL(`/m/${media.video.shareToken}`);
    await expect(
      page.getByRole("heading", { name: "checkout-flow.mp4" }),
    ).toBeVisible();
    await expect(page.locator("video")).toBeVisible();
    await expect(next).toBeDisabled();

    // Clicking the pair opens the "after": both halves are one row, and the
    // after is the state of the work being reviewed.
    await sidebar.getByText("checkout.png").click();
    await expect(page).toHaveURL(`/m/${media.after.shareToken}`);

    await screenshot(page, "media-share-sidebar");
  },
);

loggedTest(
  "keeps a pair on one row whichever half is opened",
  async ({ page, project }) => {
    const media = await createMediaScenario({
      projectId: project.id,
      withPullRequest: true,
    });

    // Landing on the "before" shows the same comparison and marks the same row.
    await page.goto(`/m/${media.before.shareToken}`);

    const sidebar = page.getByRole("region", { name: "Pull request media" });
    const active = sidebar.locator("[aria-current]");
    await expect(active).toHaveCount(1);
    await expect(active).toContainText("checkout.png");

    // And navigating on from it moves relative to the row, not to the half.
    await page.keyboard.press("ArrowUp");
    await expect(page).toHaveURL(`/m/${media.solo.shareToken}`);
  },
);

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

loggedTest(
  "pins a comment on a media that stands alone",
  async ({ page, auth, project }) => {
    // A lone media has no counterpart, so no compare toolbar and a single pane —
    // the pin tool has to work there exactly as it does beside a pair. This one
    // also has no recorded dimensions, which used to take the comment layer off
    // the page entirely: the tool armed, showed its crosshair, and dropped every
    // click.
    const media = await createMediaScenario({
      projectId: project.id,
      commentAuthorId: auth.user.id,
    });

    await page.goto(`/m/${media.solo.shareToken}`);

    await page.getByRole("button", { name: "Pin a comment" }).click();
    await page
      .getByRole("button", { name: "Pick the spot to comment on" })
      .click({ position: { x: 200, y: 150 } });

    const draftDialog = page.getByRole("dialog", { name: "Add a comment" });
    const editor = draftDialog.getByLabel("Add a comment");
    await editor.click();
    await editor.fill("The sidebar is cropped here.");
    await draftDialog
      .getByRole("button", { name: "Submit the comment" })
      .click();

    await expect(page.getByText("The sidebar is cropped here.")).toHaveCount(2);
    await expect(page.getByText("pinned on the image")).toBeVisible();
  },
);

loggedTest(
  "marks the changed pixels of a before/after pair",
  async ({ page, project }) => {
    // The pair has been compared, so the share page offers the build's own
    // overlay controls and draws the mask over the "after".
    const media = await createMediaScenario({ projectId: project.id });

    await page.goto(`/m/${media.after.shareToken}`);

    // IconButtons take their name from a tooltip, which is not an accessible
    // name — the lucide class is the handle.
    const viewer = page.getByRole("main");
    const toggle = viewer.locator("button:has(.lucide-eye)");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(
      viewer.locator("button:has(.lucide-locate-fixed)"),
    ).toBeVisible();
    await expect(
      viewer.locator("button:has(.lucide-paintbrush)"),
    ).toBeVisible();

    // The mask is a CSS mask on a span rather than an `img`, so it is located
    // through the style that draws it.
    const mask = page.locator(
      '[data-media-pane] span[style*="diff-1024-to-720.png"]',
    );
    await expect(mask).toHaveCount(1);

    await screenshot(page, "media-share-changes-overlay");

    // Hiding it leaves the pair on screen, untouched — which is the point of
    // having a toggle rather than a mode.
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(mask).toHaveCSS("opacity", "0");
    await expect(
      page.getByRole("img", { name: "checkout.png (after)" }),
    ).toBeVisible();
  },
);

loggedTest(
  "rings the half a pin would land on, in compare mode",
  async ({ page, auth, project }) => {
    // Side by side puts two images on screen and only one of them takes
    // comments. Arming the tool without saying which is which leaves the
    // reviewer to click and find out.
    const media = await createMediaScenario({
      projectId: project.id,
      commentAuthorId: auth.user.id,
    });

    await page.goto(`/m/${media.after.shareToken}`);
    await page.getByRole("button", { name: "Compare" }).click();
    await page.getByRole("button", { name: "Side by side" }).click();

    const panes = page.locator("[data-media-pane]");
    await expect(panes).toHaveCount(2);
    // Nothing is singled out until the tool is armed: a ring that is always on
    // reads as "selected" and says nothing about where a click goes.
    await expect(
      page.locator("[data-media-pane][data-pin-target]"),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Pin a comment" }).click();

    const target = page.locator("[data-media-pane][data-pin-target]");
    await expect(target).toHaveCount(1);
    // The commentable half is this media's own — the "after" — not the
    // counterpart drawn beside it.
    await expect(
      target.getByRole("img", { name: "checkout.png (after)" }),
    ).toBeVisible();

    await screenshot(page, "media-share-pin-target");
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
