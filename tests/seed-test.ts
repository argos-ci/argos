/* eslint-disable no-empty-pattern */
import { test as base } from "@playwright/test";

import { Account } from "../apps/backend/src/database/models/Account";
import { Project } from "../apps/backend/src/database/models/Project";
import {
  BuildScenario,
  createBuildScenario,
  createProject,
  createTeamAccount,
} from "../apps/backend/src/database/seeds";

type WorkerFixtures = {
  seedAccount: { account: Account; slug: string };
  seedProject: { project: Project; accountSlug: string; projectName: string };
  seedBuilds: BuildScenario;
};

export const test = base.extend<object, WorkerFixtures>({
  seedAccount: [
    async ({}, use, workerInfo) => {
      const slug = `team-w${workerInfo.workerIndex}`;
      const { account } = await createTeamAccount({ slug, name: "Smooth" });
      await use({ account, slug });
    },
    { scope: "worker" },
  ],

  seedProject: [
    async ({ seedAccount }, use) => {
      const projectName = "big";
      const project = await createProject({
        accountId: seedAccount.account.id,
        name: projectName,
      });
      await use({ project, accountSlug: seedAccount.slug, projectName });
    },
    { scope: "worker" },
  ],

  seedBuilds: [
    async ({ seedProject }, use, workerInfo) => {
      const builds = await createBuildScenario({
        projectId: seedProject.project.id,
        keyPrefix: `w${workerInfo.workerIndex}-`,
      });
      await use(builds);
    },
    { scope: "worker" },
  ],
});
