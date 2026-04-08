import { argosScreenshot } from "@argos-ci/playwright";
import { expect } from "@playwright/test";

import { BuildScenario } from "../apps/backend/src/database/seeds";
import { test } from "./seed-test";

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
  test(build.name, async ({ page, seedProject, seedBuilds }) => {
    const number = build.getNumber(seedBuilds);
    await page.goto(
      `/${seedProject.accountSlug}/${seedProject.projectName}/builds/${number}`,
    );
    await expect(page.getByText(`Build ${number}`)).toBeVisible();
    if (build.compare !== false) {
      await expect(page.getByText(`Changes from`)).toBeVisible();
    }
    await argosScreenshot(page, `build-${build.name}`);
  });
});
