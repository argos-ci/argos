import { expect, type Page } from "@playwright/test";

import { AutomationRule } from "../apps/backend/src/database/models";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, takeLoggedScreenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest(
  "project tests page",
  async ({ page, team, plan, project, builds }) => {
    void builds;
    await page.goto(`/${team.account.slug}/${project.name}/tests`);
    await expect(page.getByRole("heading", { name: "Tests" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /penelope-argos\.jpg/ }),
    ).toBeVisible();
    await takeLoggedScreenshot({
      page,
      name: "project-tests",
      replacements: {
        [team.account.slug]: "acme",
        [getPlanLabel(plan.name)]: "Pro",
      },
    });
  },
);

loggedTest(
  "test detail page",
  async ({ page, team, plan, project, builds }) => {
    void builds;
    await page.goto(`/${team.account.slug}/${project.name}/tests`);
    await page.getByRole("link", { name: /penelope-argos\.jpg/ }).click();
    await expect(
      page.getByRole("heading", { name: "penelope-argos.jpg" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Changes/ })).toBeVisible();
    await takeLoggedScreenshot({
      page,
      name: "test-detail",
      replacements: {
        [team.account.slug]: "acme",
        [getPlanLabel(plan.name)]: "Pro",
      },
    });
  },
);

loggedTest("project settings page", async ({ page, team, plan, project }) => {
  await page.goto(`/${team.account.slug}/${project.name}/settings`);
  await expect(
    page.getByRole("heading", { name: "Project Settings" }),
  ).toBeVisible();
  await expect(page.getByText("Upload token")).toBeVisible();
  await takeLoggedScreenshot({
    page,
    name: "project-settings",
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
      [project.token]: "arp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
  });
});

loggedTest(
  "project automations page",
  async ({ page, team, plan, project }) => {
    await AutomationRule.query().insert({
      active: true,
      name: "Notify visual changes",
      projectId: project.id,
      on: ["build.completed"],
      if: {
        all: [],
      },
      then: [
        {
          action: "sendSlackMessage",
          actionPayload: {
            channelId: "CARGOSVISUAL",
          },
        },
      ],
    });

    await page.goto(`/${team.account.slug}/${project.name}/automations`);
    await expect(
      page.getByRole("heading", { name: "Automations Rules" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Notify visual changes/ }),
    ).toBeVisible();
    await takeLoggedScreenshot({
      page,
      name: "project-automations",
      replacements: {
        [team.account.slug]: "acme",
        [getPlanLabel(plan.name)]: "Pro",
      },
    });
  },
);

loggedTest("new automation page", async ({ page, team, plan, project }) => {
  await page.goto(`/${team.account.slug}/${project.name}/automations/new`);
  await expect(
    page.getByRole("heading", { name: "New Automation Rule" }),
  ).toBeVisible();
  await expect(page.getByText("Build Completed")).toBeVisible();
  await takeLoggedScreenshot({
    page,
    name: "project-automation-new",
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

const accountPages = [
  {
    title: "team projects page",
    path: "",
    assertion: async (page: Page) => {
      await expect(
        page.getByRole("heading", { name: "Projects" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /sparkle/ })).toBeVisible();
    },
    screenshot: "account-projects",
  },
  {
    title: "new project page",
    path: "new",
    assertion: async (page: Page) => {
      await expect(
        page.getByRole("heading", { name: "Create a new Project" }),
      ).toBeVisible();
    },
    screenshot: "account-new-project",
  },
  {
    title: "account analytics page",
    path: "~/analytics",
    assertion: async (page: Page) => {
      await expect(
        page.getByRole("heading", { name: "Analytics" }),
      ).toBeVisible();
      await expect(page.getByText("Screenshots by Project")).toBeVisible();
    },
    screenshot: "account-analytics",
  },
  {
    title: "team settings general page",
    path: "settings",
    assertion: async (page: Page) => {
      await expect(
        page.getByRole("heading", { name: "Team Settings" }),
      ).toBeVisible();
      await expect(page.getByText("Team Name")).toBeVisible();
    },
    screenshot: "team-settings-general",
  },
  {
    title: "team settings billing page",
    path: "settings/billing",
    assertion: async (page: Page) => {
      await expect(page.getByRole("heading", { name: "Plan" })).toBeVisible();
      await expect(page.getByText("Current period")).toBeVisible();
    },
    screenshot: "team-settings-billing",
  },
  {
    title: "team settings members page",
    path: "settings/members",
    assertion: async (page: Page) => {
      await expect(
        page.getByRole("heading", { name: "Members" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Default access role" }),
      ).toBeVisible();
    },
    screenshot: "team-settings-members",
  },
  {
    title: "team settings integrations page",
    path: "settings/integrations",
    assertion: async (page: Page) => {
      await expect(page.getByRole("heading", { name: "Slack" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "GitLab" })).toBeVisible();
    },
    screenshot: "team-settings-integrations",
  },
  {
    title: "team settings security page",
    path: "settings/security-and-privacy",
    assertion: async (page: Page) => {
      await expect(
        page.getByRole("heading", { name: "SAML Single Sign-On" }),
      ).toBeVisible();
    },
    screenshot: "team-settings-security",
  },
];

accountPages.forEach((accountPage) => {
  loggedTest(accountPage.title, async ({ page, team, plan }) => {
    await page.goto(`/${team.account.slug}/${accountPage.path}`);
    await accountPage.assertion(page);
    await takeLoggedScreenshot({
      page,
      name: accountPage.screenshot,
      replacements: {
        [team.account.slug]: "acme",
        [getPlanLabel(plan.name)]: "Pro",
      },
    });
  });
});
