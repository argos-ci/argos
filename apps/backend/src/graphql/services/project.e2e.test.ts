import { test as base, describe, expect } from "vitest";

import {
  AutomationActionRun,
  AutomationRule,
  AutomationRun,
  Build,
  IgnoredFile,
  Project,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Test,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { unsafe_deleteProject } from "./project";

type SeededProject = {
  project: Project;
  automationRule: AutomationRule;
  automationRun: AutomationRun;
};

const test = base.extend<{
  factory: typeof factory;
  seededProject: SeededProject;
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  seededProject: async ({ factory }, use) => {
    const project = await factory.Project.create();
    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
    });

    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
    });

    const [
      slackChannel,
      screenshot,
      _notification,
      review,
      diff,
      fileA,
      fileB,
    ] = await Promise.all([
      factory.SlackChannel.create(),
      factory.Screenshot.create({ screenshotBucketId: compareBucket.id }),
      factory.BuildNotification.create({ buildId: build.id }),
      factory.BuildReview.create({ buildId: build.id, state: "approved" }),
      factory.ScreenshotDiff.create({ buildId: build.id }),
      factory.File.create({ key: "diff-file-a", type: "screenshotDiff" }),
      factory.File.create({ key: "diff-file-b", type: "screenshotDiff" }),
    ]);

    const [, createdTest] = await Promise.all([
      factory.ScreenshotDiffReview.create({
        buildReviewId: review.id,
        screenshotDiffId: diff.id,
        state: "approved",
      }),
      factory.Test.create({
        name: screenshot.name,
        projectId: project.id,
        buildName: "default",
      }),
    ]);

    await IgnoredFile.query().insert([
      { projectId: project.id, testId: createdTest.id, fileId: fileA.id },
      { projectId: project.id, testId: createdTest.id, fileId: fileB.id },
    ]);

    const automationRule = await factory.AutomationRule.create({
      projectId: project.id,
      on: ["build.completed"],
      then: [
        {
          action: "sendSlackMessage",
          actionPayload: { channelId: slackChannel.id },
        },
      ],
    });

    const automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });

    await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "sendSlackMessage",
      actionPayload: { channelId: slackChannel.id },
      jobStatus: "pending",
    });

    await use({ project, automationRule, automationRun });
  },
});

describe("unsafe_deleteProject", () => {
  test("should delete all project-related data", async ({
    seededProject: { project, automationRule, automationRun },
  }) => {
    await unsafe_deleteProject({ projectId: project.id });
    const [
      rules,
      runs,
      actionRuns,
      builds,
      buckets,
      screenshots,
      diffs,
      ignoredFiles,
      tests,
      projects,
    ] = await Promise.all([
      AutomationRule.query().where({ projectId: project.id }),
      AutomationRun.query().where({ automationRuleId: automationRule.id }),
      AutomationActionRun.query().where({
        automationRunId: automationRun.id,
      }),
      Build.query().where({ projectId: project.id }),
      ScreenshotBucket.query().where({ projectId: project.id }),
      Screenshot.query().where({ screenshotBucketId: project.id }),
      ScreenshotDiff.query().where({ buildId: project.id }),
      IgnoredFile.query().where({ projectId: project.id }),
      Test.query().where({ projectId: project.id }),
      Project.query().where({ id: project.id }),
    ]);

    expect(rules).toHaveLength(0);
    expect(runs).toHaveLength(0);
    expect(actionRuns).toHaveLength(0);
    expect(builds).toHaveLength(0);
    expect(buckets).toHaveLength(0);
    expect(screenshots).toHaveLength(0);
    expect(diffs).toHaveLength(0);
    expect(ignoredFiles).toHaveLength(0);
    expect(tests).toHaveLength(0);
    expect(projects).toHaveLength(0);
  });
});
