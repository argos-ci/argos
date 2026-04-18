/* eslint-disable no-empty-pattern */
import { test as base } from "@playwright/test";

import type {
  Account,
  Plan,
  Project,
  Team,
  User,
} from "../apps/backend/src/database/models";
import { Plan as PlanModel } from "../apps/backend/src/database/models";
import {
  BuildScenario,
  createBuildScenario,
  createProject,
  createTeamAccount,
  createUserAccount,
} from "../apps/backend/src/database/seeds";

type TestFixtures = {
  user: { user: User; account: Account };
  team: { team: Team; account: Account };
  project: Project;
  builds: BuildScenario;
};

type WorkerFixtures = {
  plan: Plan;
};

export const seedTest = base.extend<TestFixtures, WorkerFixtures>({
  user: async ({}, use, testInfo) => {
    const id = testInfo.testId;
    console.log("TEEST ID", id);
    const user = await createUserAccount({
      email: `kyle-${id}@acme.com`,
      name: "Kyle Bertolino",
      slug: `kyle-${id}`,
    });
    await use(user);
  },
  plan: [
    async ({}, use, workerInfo) => {
      const plan = await PlanModel.query().insertAndFetch({
        name: `pro-${workerInfo.workerIndex}`,
        includedScreenshots: 15000,
        githubPlanId: null,
        stripeProductId: null,
        usageBased: false,
        githubSsoIncluded: true,
        fineGrainedAccessControlIncluded: true,
        samlIncluded: true,
        interval: "month",
      });
      await use(plan);
    },
    { scope: "worker" },
  ],
  team: async ({ plan }, use, testInfo) => {
    const slug = `acme-${testInfo.testId}`;
    const team = await createTeamAccount({
      slug,
      name: "Acme",
      forcedPlanId: plan.id,
    });
    await use(team);
  },
  project: async ({ team }, use, testInfo) => {
    const project = await createProject({
      accountId: team.account.id,
      name: `sparkle-${testInfo.testId}`,
    });
    await use(project);
  },
  builds: async ({ project }, use, testInfo) => {
    const builds = await createBuildScenario({
      projectId: project.id,
      keyPrefix: `${testInfo.testId}-`,
    });
    await use(builds);
  },
});
