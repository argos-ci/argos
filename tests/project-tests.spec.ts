import { expect } from "@playwright/test";

import { Comment } from "../apps/backend/src/database/models";
import {
  createFlakyTestScenario,
  createIgnoredChangeScenario,
  createTestChangeScenario,
} from "../apps/backend/src/database/seeds";
import { formatTestId } from "../apps/backend/src/util/test-id";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

/** A one-line rich-text comment body. */
function doc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("tests", async ({ page, team, project, builds }) => {
  void builds;
  await page.goto(`/${team.account.slug}/${project.name}/tests`);
  await expect(page.getByRole("heading", { name: "Tests" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /penelope-argos\.jpg/ }),
  ).toBeVisible();
  await screenshot(page, "project-tests");
});

loggedTest("test detail", async ({ page, team, project, builds }) => {
  void builds;
  await page.goto(`/${team.account.slug}/${project.name}/tests`);
  await page.getByRole("link", { name: /penelope-argos\.jpg/ }).click();
  await expect(
    page.getByRole("heading", { name: "penelope-argos.jpg" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Changes/ })).toBeVisible();
  const match = page.url().match(/\/tests\/([^/?#]+)/);
  if (!match?.[1]) {
    throw new Error("Test ID should be present in the URL");
  }
  const testId = match[1];
  await screenshot(page, "test-detail", {
    replacements: {
      [testId]: "SPARKLE-XXX",
    },
  });
});

loggedTest("test view with a change", async ({ page, team, project }) => {
  const { test } = await createTestChangeScenario({ projectId: project.id });
  const testId = formatTestId({ projectName: project.name, testId: test.id });

  await page.goto(`/${team.account.slug}/${project.name}/tests/${testId}`);

  // The change's snapshot diff viewer is rendered.
  await expect(
    page.getByRole("heading", { name: "penelope-argos.jpg" }),
  ).toBeVisible();
  await expect(page.getByText("Occurrences")).toBeVisible();
  await expect(page.getByText("Baseline", { exact: false })).toBeVisible();

  // No comment affordances in this view, despite the user being able to review.
  await expect(page.getByRole("button", { name: "Comment tool" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Move tool" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /comments$/ })).toHaveCount(0);

  // The change image is served from the CDN and actually renders (it isn't a
  // broken image).
  await expect
    .poll(() =>
      page
        .getByRole("img", { name: "Changes screenshot" })
        .first()
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
    )
    .toBe(true);

  await screenshot(page, "test-view-change");
});

loggedTest(
  "test view flags ignored changes and filters on them",
  async ({ page, team, project, auth }) => {
    const { test } = await createIgnoredChangeScenario({
      projectId: project.id,
      userId: auth.user.id,
    });
    const testId = formatTestId({ projectName: project.name, testId: test.id });

    await page.goto(`/${team.account.slug}/${project.name}/tests/${testId}`);

    // The badge is on the card in the list, without hovering it.
    const badge = page
      .getByRole("region", { name: "Changes" })
      .getByText("Ignored", { exact: true });
    await expect(badge).toBeVisible();

    // Ignored changes are part of the default view, and the filter narrows it
    // down to them.
    await expect(page.getByRole("heading", { name: /^Changes/ })).toBeVisible();
    await page.getByRole("button", { name: "Ignored", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /^Ignored changes/ }),
    ).toBeVisible();
    await expect(badge).toBeVisible();
    // The filter is in the URL, so the view survives a reload and can be shared.
    await expect(page).toHaveURL(/changes=ignored/);

    await screenshot(page, "test-view-ignored-changes");
  },
);

loggedTest(
  "test view lets a reviewer comment on the test",
  async ({ page, team, project }) => {
    const { test } = await createTestChangeScenario({ projectId: project.id });
    const testId = formatTestId({ projectName: project.name, testId: test.id });

    await page.goto(`/${team.account.slug}/${project.name}/tests/${testId}`);

    // The right column carries the change history and the activity feed.
    await expect(page.getByText("First change")).toBeVisible();
    await expect(page.getByText("Last change")).toBeVisible();
    const activity = page.getByRole("heading", { name: "Activity" });
    await expect(activity).toBeVisible();
    await expect(page.getByText("Test created")).toBeVisible();

    // Nobody follows the test until they engage with it.
    await expect(page.getByRole("button", { name: "Subscribe" })).toBeVisible();

    // Posting a comment adds it to the feed.
    const editor = page.getByLabel("Add a comment");
    await editor.click();
    await editor.fill("This test keeps flapping on CI.");
    await page.getByRole("button", { name: "Submit the comment" }).click();
    await expect(
      page.getByText("This test keeps flapping on CI."),
    ).toBeVisible();

    // Commenting subscribes the author, so the bell flips to "Unsubscribe".
    const unsubscribe = page.getByRole("button", { name: "Unsubscribe" });
    await expect(unsubscribe).toBeVisible();

    await screenshot(page, "test-view-comment");

    // And the toggle opts back out.
    await unsubscribe.click();
    await expect(page.getByRole("button", { name: "Subscribe" })).toBeVisible();
  },
);

loggedTest(
  "test view marks a comment an agent posted for its author",
  async ({ page, auth, team, project }) => {
    const { test } = await createTestChangeScenario({ projectId: project.id });
    const testId = formatTestId({ projectName: project.name, testId: test.id });

    // Two comments from the same person: one they typed, one Claude Code posted
    // with their credentials. Only the second is marked, which is the whole
    // point — the author is identical on both.
    await Comment.query().insert([
      {
        testId: test.id,
        userId: auth.user.id,
        content: doc("This one keeps flapping on CI."),
      },
      {
        testId: test.id,
        userId: auth.user.id,
        content: doc("Retried it 20 times — the header animation races."),
        agent: "claude-code",
      },
    ]);

    await page.goto(`/${team.account.slug}/${project.name}/tests/${testId}`);

    await expect(
      page.getByText("Retried it 20 times — the header animation races."),
    ).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: "Posted through Claude Code on behalf of this user",
      }),
    ).toBeVisible();
    // The comment the same person typed carries no marker.
    await expect(
      page.getByRole("img", { name: /^Posted through/ }),
    ).toHaveCount(1);

    await screenshot(page, "test-view-agent-comment");
  },
);

loggedTest(
  "test view hands out a prompt to fix the flakiness with an agent",
  async ({ page, team, project, browserName }) => {
    const { test } = await createFlakyTestScenario({ projectId: project.id });
    const testId = formatTestId({ projectName: project.name, testId: test.id });

    // Reading back what was copied needs the clipboard permissions, and only
    // Chromium exposes them to Playwright — Firefox rejects the names outright.
    const canReadClipboard = browserName === "chromium";

    await page.goto(`/${team.account.slug}/${project.name}/tests/${testId}`);
    if (canReadClipboard) {
      await page
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"], {
          origin: new URL(page.url()).origin,
        });
    }

    // The test is flaky, so the section opens itself: the actions are reachable
    // without expanding anything. Claude is the agent offered by default.
    await expect(
      page.getByRole("heading", { name: "Fix with AI" }),
    ).toBeVisible();
    const openInClaude = page.getByRole("link", {
      name: "Open in Claude",
    });
    await expect(openInClaude).toBeVisible();

    // The agent is opened through its own deep link, which carries the prompt:
    // it names the test and the API endpoints the agent has to call.
    const href = (await openInClaude.getAttribute("href")) ?? "";
    expect(href).toMatch(/^claude:\/\/code\/new\?q=/);
    const prompt = new URLSearchParams(href.split("?")[1]).get("q") ?? "";
    expect(prompt).toContain("Fix the flaky Argos visual test");
    expect(prompt).toContain("penelope-argos.jpg");
    expect(prompt).toContain(`Test id: ${testId}`);
    expect(prompt).toContain(
      `/projects/${team.account.slug}/${project.name}/tests/${testId}?metricsPeriod=LAST_7_DAYS`,
    );
    expect(prompt).toContain(`/tests/${testId}/changes`);
    expect(prompt).toContain("listTestChanges");

    // The other agents, and the clipboard, are one menu away.
    const openMenu = () =>
      page
        .getByRole("button", { name: "Choose what to do with the prompt" })
        .click();
    await openMenu();
    await expect(
      page.getByRole("option", { name: "Open in Codex" }),
    ).toHaveAttribute("href", /^codex:\/\/new\?prompt=/);
    const cursorItem = page.getByRole("option", { name: "Open in Cursor" });
    await expect(cursorItem).toHaveAttribute(
      "href",
      /^cursor:\/\/anysphere\.cursor-deeplink\/prompt\?text=/,
    );

    // Copying is an action like opening an agent, so it puts the prompt on the
    // clipboard and becomes the one the button offers.
    await page.getByRole("option", { name: "Copy prompt" }).click();
    const copyButton = page.getByRole("button", { name: /Cop(y prompt|ied)/ });
    await expect(copyButton).toBeVisible();
    if (canReadClipboard) {
      // The button only confirms itself once the write resolved, so it stands in
      // for the copy having landed.
      await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => navigator.clipboard.readText()))
        .toContain(`Test id: ${testId}`);
    }

    // And the choice is remembered, so the next flaky test starts there.
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Copy prompt" }),
    ).toBeVisible();

    // Picking an agent moves the button back to it. Only Chromium ignores the
    // unknown scheme the click navigates to; the others would stop on a dialog.
    if (browserName === "chromium") {
      await openMenu();
      await page.getByRole("option", { name: "Open in Cursor" }).click();
      await page.reload();
      await expect(
        page.getByRole("link", { name: "Open in Cursor" }),
      ).toBeVisible();
    }
  },
);

loggedTest(
  "test view folds the AI prompt away on a stable test",
  async ({ page, team, project }) => {
    const { test } = await createTestChangeScenario({ projectId: project.id });
    const testId = formatTestId({ projectName: project.name, testId: test.id });

    await page.goto(`/${team.account.slug}/${project.name}/tests/${testId}`);

    // Nothing to fix here, so the section is folded into its header: still
    // there, but not competing with the metrics saying the test is fine.
    const heading = page.getByRole("heading", { name: "Fix with AI" });
    await expect(heading).toBeVisible();
    const openInClaude = page.getByRole("link", {
      name: "Open in Claude",
    });
    await expect(openInClaude).toBeHidden();

    // And opening it hands out the same prompt.
    await heading.click();
    await expect(openInClaude).toBeVisible();
  },
);

loggedTest(
  "test view explains an empty ignored list",
  async ({ page, team, project }) => {
    const { test } = await createTestChangeScenario({ projectId: project.id });
    const testId = formatTestId({ projectName: project.name, testId: test.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/tests/${testId}?changes=ignored`,
    );

    // The test has a change, but none of them is ignored.
    await expect(
      page.getByRole("heading", { name: "No ignored changes" }),
    ).toBeVisible();

    // The empty state hands back the unfiltered list.
    await page.getByRole("button", { name: "See all changes" }).click();
    await expect(page.getByRole("heading", { name: /^Changes/ })).toBeVisible();
    await expect(page.getByText("Occurrences")).toBeVisible();
  },
);
