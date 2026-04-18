/* eslint-disable no-empty-pattern */
import { createHash } from "node:crypto";
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

function getShortTestId(testId: string) {
  return createHash("sha256").update(testId).digest("hex").slice(0, 10);
}

export const seedTest = base.extend<TestFixtures, WorkerFixtures>({
  user: async ({}, use, testInfo) => {
    const id = getShortTestId(testInfo.testId);
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
    const id = getShortTestId(testInfo.testId);
    const slug = `acme-${id}`;
    const team = await createTeamAccount({
      slug,
      name: "Acme",
      forcedPlanId: plan.id,
    });
    await use(team);
  },
  project: async ({ team }, use, testInfo) => {
    const id = getShortTestId(testInfo.testId);
    const project = await createProject({
      accountId: team.account.id,
      name: `sparkle-${id}`,
    });
    await use(project);
  },
  builds: async ({ project }, use, testInfo) => {
    const id = getShortTestId(testInfo.testId);
    const builds = await createBuildScenario({
      projectId: project.id,
      keyPrefix: `${id}-`,
    });
    await use(builds);
  },
});
