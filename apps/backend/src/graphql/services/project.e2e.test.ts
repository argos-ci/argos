import { beforeEach, describe, expect, it } from "vitest";

import {
  Artifact,
  ArtifactBucket,
  ArtifactDiff,
  AutomationActionRun,
  AutomationRule,
  AutomationRun,
  Build,
  Project,
  Test,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { unsafe_deleteProject } from "./project.js";

describe("unsafe_deleteProject", () => {
  let project: Project;
  let automationRule: AutomationRule;
  let automationRun: AutomationRun;

  beforeEach(async () => {
    await setupDatabase();

    project = await factory.Project.create();
    const headBucket = await factory.ArtifactBucket.create({
      projectId: project.id,
    });

    const build = await factory.Build.create({
      projectId: project.id,
      headArtifactBucketId: headBucket.id,
    });

    const [slackChannel, artifact, _notification, review, diff] =
      await Promise.all([
        factory.SlackChannel.create(),
        factory.Artifact.create({ artifactBucketId: headBucket.id }),
        factory.BuildNotification.create({ buildId: build.id }),
        factory.BuildReview.create({ buildId: build.id, state: "approved" }),
        factory.ArtifactDiff.create({ buildId: build.id }),
      ]);

    await Promise.all([
      factory.ArtifactDiffReview.create({
        buildReviewId: review.id,
        artifactDiffId: diff.id,
        state: "approved",
      }),
      factory.Test.create({
        name: artifact.name,
        projectId: project.id,
        buildName: "default",
      }),
    ]);

    automationRule = await factory.AutomationRule.create({
      projectId: project.id,
      on: ["build.completed"],
      then: [
        {
          action: "sendSlackMessage",
          actionPayload: { channelId: slackChannel.id },
        },
      ],
    });

    automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });

    await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "sendSlackMessage",
      actionPayload: { channelId: slackChannel.id },
      jobStatus: "pending",
    });
  });

  it("should delete all project-related data", async () => {
    await unsafe_deleteProject({ projectId: project.id });
    const [
      rules,
      runs,
      actionRuns,
      builds,
      buckets,
      screenshots,
      diffs,
      tests,
      projects,
    ] = await Promise.all([
      AutomationRule.query().where({ projectId: project.id }),
      AutomationRun.query().where({ automationRuleId: automationRule.id }),
      AutomationActionRun.query().where({
        automationRunId: automationRun.id,
      }),
      Build.query().where({ projectId: project.id }),
      ArtifactBucket.query().where({ projectId: project.id }),
      Artifact.query().where({ artifactBucketId: project.id }),
      ArtifactDiff.query().where({ buildId: project.id }),
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
    expect(tests).toHaveLength(0);
    expect(projects).toHaveLength(0);
  });
});
