import { beforeEach, describe, expect, it } from "vitest";

import type { Build, Project, ScreenshotBucket } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getBuildImpactAnalysis } from "./impact-analysis";

const test = it.extend<{
  project: Project;
  compareBucket: ScreenshotBucket;
  build: Build;
}>({
  project: async ({}, use) => {
    const project = await factory.Project.create();
    await use(project);
  },
  compareBucket: async ({ project }, use) => {
    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
    });
    await use(compareBucket);
  },
  build: async ({ project, compareBucket }, use) => {
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      conclusion: "changes-detected",
    });
    await use(build);
  },
});

describe("getBuildImpactAnalysis", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("aggregates metadata of changed screenshots", async ({
    project,
    compareBucket,
    build,
  }) => {
    const [chromiumButton, chromiumCard, firefoxUnchanged] =
      await factory.Screenshot.createMany(3, [
        {
          screenshotBucketId: compareBucket.id,
          metadata: {
            browser: { name: "chromium", version: "120.0" },
            colorScheme: "light",
            story: { id: "actions-button--primary" },
            sdk: { name: "@argos-ci/storybook", version: "1.0.0" },
            automationLibrary: { name: "storybook", version: "8.0.0" },
          },
        },
        {
          screenshotBucketId: compareBucket.id,
          metadata: {
            browser: { name: "chromium", version: "120.0" },
            colorScheme: "light",
            story: { id: "actions-button--secondary" },
            sdk: { name: "@argos-ci/storybook", version: "1.0.0" },
            automationLibrary: { name: "storybook", version: "8.0.0" },
          },
        },
        {
          screenshotBucketId: compareBucket.id,
          metadata: {
            browser: { name: "firefox", version: "121.0" },
            colorScheme: "dark",
            story: { id: "display-card--default" },
            sdk: { name: "@argos-ci/storybook", version: "1.0.0" },
            automationLibrary: { name: "storybook", version: "8.0.0" },
          },
        },
      ]);
    const baseScreenshots = await factory.Screenshot.createMany(3, {
      screenshotBucketId: (
        await factory.ScreenshotBucket.create({ projectId: project.id })
      ).id,
    });
    await factory.ScreenshotDiff.createMany(4, [
      // Two diffs sharing a group count as one unique change.
      {
        buildId: build.id,
        baseScreenshotId: baseScreenshots[0]!.id,
        compareScreenshotId: chromiumButton!.id,
        score: 0.3,
        group: "group-1",
      },
      {
        buildId: build.id,
        baseScreenshotId: baseScreenshots[1]!.id,
        compareScreenshotId: chromiumCard!.id,
        score: 0.3,
        group: "group-1",
      },
      {
        buildId: build.id,
        baseScreenshotId: baseScreenshots[2]!.id,
        compareScreenshotId: chromiumButton!.id,
        score: 0.2,
        group: null,
      },
      // Unchanged diff, must be excluded from the analysis.
      {
        buildId: build.id,
        baseScreenshotId: baseScreenshots[2]!.id,
        compareScreenshotId: firefoxUnchanged!.id,
        score: 0,
        group: null,
      },
    ]);

    const analysis = await getBuildImpactAnalysis(build);

    expect(analysis).toEqual({
      changedCount: 3,
      uniqueChangeCount: 2,
      changedBrowsers: ["chromium"],
      buildBrowsers: ["chromium", "firefox"],
      changedColorSchemes: ["light"],
      buildColorSchemes: ["dark", "light"],
      buildViewports: [],
      buildAutomationLibraries: ["storybook"],
      affectedComponents: [{ name: "actions-button", count: 3 }],
      affectedStories: [
        { name: "actions-button--primary", count: 2 },
        { name: "actions-button--secondary", count: 1 },
      ],
      affectedTests: [],
    });
  });

  test("counts added screenshots as affected components", async ({
    compareBucket,
    build,
  }) => {
    const addedScreenshot = await factory.Screenshot.create({
      screenshotBucketId: compareBucket.id,
      metadata: {
        browser: { name: "chromium", version: "120.0" },
        colorScheme: "light",
        story: { id: "forms-input--default" },
        sdk: { name: "@argos-ci/storybook", version: "1.0.0" },
        automationLibrary: { name: "storybook", version: "8.0.0" },
      },
    });
    // An added screenshot has no base to compare against.
    await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: null,
      compareScreenshotId: addedScreenshot.id,
      score: null,
      group: null,
    });

    const analysis = await getBuildImpactAnalysis(build);

    expect(analysis).toEqual({
      changedCount: 0,
      uniqueChangeCount: 0,
      changedBrowsers: [],
      buildBrowsers: ["chromium"],
      changedColorSchemes: [],
      buildColorSchemes: ["light"],
      buildViewports: [],
      buildAutomationLibraries: ["storybook"],
      affectedComponents: [{ name: "forms-input", count: 1 }],
      affectedStories: [{ name: "forms-input--default", count: 1 }],
      affectedTests: [],
    });
  });

  test("returns empty aggregates without metadata", async ({ build }) => {
    const analysis = await getBuildImpactAnalysis(build);
    expect(analysis).toEqual({
      changedCount: 0,
      uniqueChangeCount: 0,
      changedBrowsers: [],
      buildBrowsers: [],
      changedColorSchemes: [],
      buildColorSchemes: [],
      buildViewports: [],
      buildAutomationLibraries: [],
      affectedComponents: [],
      affectedStories: [],
      affectedTests: [],
    });
  });
});
