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

type WorkerFixtures = {
  user: { user: User; account: Account };
  plan: Plan;
  team: { team: Team; account: Account };
  project: Project;
  builds: BuildScenario;
};

export const seedTest = base.extend<object, WorkerFixtures>({
  user: [
    async ({}, use, workerInfo) => {
      const user = await createUserAccount({
        email: `kyle-${workerInfo.workerIndex}@acme.com`,
        name: "Kyle Bertolino",
        slug: `kyle-${workerInfo.workerIndex}`,
      });
      await use(user);
    },
    { scope: "worker" },
  ],
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
  team: [
    async ({ plan }, use, workerInfo) => {
      const slug = `acme-${workerInfo.workerIndex}`;
      const team = await createTeamAccount({
        slug,
        name: "Acme",
        forcedPlanId: plan.id,
      });
      await use(team);
    },
    { scope: "worker" },
  ],

  project: [
    async ({ team }, use) => {
      const project = await createProject({
        accountId: team.account.id,
        name: "sparkle",
      });
      await use(project);
    },
    { scope: "worker" },
  ],

  builds: [
    async ({ project }, use, workerInfo) => {
      const builds = await createBuildScenario({
        projectId: project.id,
        keyPrefix: `w${workerInfo.workerIndex}-`,
      });
      await use(builds);
    },
    { scope: "worker" },
  ],
});
