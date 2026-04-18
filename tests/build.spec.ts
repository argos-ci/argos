import { expect } from "@playwright/test";

import { BuildScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, screenshot } from "./util";

const buildExamples: {
  name: string;
  getNumber: (builds: BuildScenario) => number;
  compare?: false;
}[] = [
  { name: "orphan", getNumber: (b) => b.orphanBuild.number },
  { name: "reference", getNumber: (b) => b.referenceBuild.number },
  {
    name: "expired",
    getNumber: (b) => b.expiredBuild.number,
    compare: false,
  },
  {
    name: "aborted",
    getNumber: (b) => b.abortedBuild.number,
    compare: false,
  },
  { name: "error", getNumber: (b) => b.errorBuild.number, compare: false },
  { name: "changes detected", getNumber: (b) => b.diffDetectedBuild.number },
  { name: "rejected", getNumber: (b) => b.rejectedBuild.number },
  {
    name: "scheduled",
    getNumber: (b) => b.pendingBuild.number,
    compare: false,
  },
  {
    name: "in progress",
    getNumber: (b) => b.inProgressBuild.number,
    compare: false,
  },
  { name: "empty", getNumber: (b) => b.emptyBuild.number, compare: false },
  { name: "stable", getNumber: (b) => b.stableBuild.number },
  {
    name: "stable with fail screenshots",
    getNumber: (b) => b.failBuild.number,
  },
  {
    name: "stable with removed screenshots",
    getNumber: (b) => b.removedBuild.number,
  },
];

buildExamples.forEach((build) => {
  loggedTest(
    build.name,
    async ({ page, auth, team, plan, project, builds }) => {
      await ensureTeamOwner({ team: team.team, user: auth.user });
      const number = build.getNumber(builds);
      await page.goto(`/${team.account.slug}/${project.name}/builds/${number}`);
      await expect(page.getByText(`Build ${number}`)).toBeVisible();
      if (build.compare !== false) {
        await expect(page.getByText(`Changes from`)).toBeVisible();
      }
      await screenshot(page, `build-${build.name}`, {
        replacements: {
          [team.account.slug]: "acme",
          [getPlanLabel(plan.name)]: "Pro",
        },
      });
    },
  );
});
