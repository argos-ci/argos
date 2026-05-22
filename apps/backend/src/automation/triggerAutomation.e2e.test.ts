import { AutomationEvents } from "@argos/schemas/automation-event";
import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import {
  AutomationActionRun,
  AutomationRun,
  Build,
  Project,
  ScreenshotBucket,
  SlackChannel,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { triggerAutomation } from "./triggerAutomation";
import type { AutomationMessage } from "./types/events";

async function getCompareScreenshotBucket(
  build: Build,
): Promise<ScreenshotBucket> {
  const compareScreenshotBucket = await build.$relatedQuery(
    "compareScreenshotBucket",
  );
  invariant(
    compareScreenshotBucket,
    `Compare screenshot bucket not found for build: ${build.id}`,
  );
  return compareScreenshotBucket;
}

async function getBuildCompletedMessage(
  build: Build,
): Promise<AutomationMessage> {
  return {
    event: AutomationEvents.BuildCompleted,
    payload: {
      build,
      compareScreenshotBucket: await getCompareScreenshotBucket(build),
    },
  };
}

describe("automation/triggerAutomation", () => {
  let project: Project;
  let build: Build;
  let slackChannel: SlackChannel;

  beforeEach(async () => {
    await setupDatabase();
    project = await factory.Project.create();
    build = await factory.Build.create({ projectId: project.id });
    slackChannel = await factory.SlackChannel.create();
  });

  describe("triggerAutomation", () => {
    it("should create AutomationRun and AutomationActionRun", async () => {
      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
      invariant(automationRuns[0], "AutomationRun should be defined");

      const actionRuns = await AutomationActionRun.query().where({
        automationRunId: automationRuns[0].id,
      });
      expect(actionRuns).toHaveLength(1);
      invariant(actionRuns[0], "AutomationActionRun should be defined");
      expect(actionRuns[0].action).toBe("sendSlackMessage");
      invariant(
        "channelId" in actionRuns[0].actionPayload,
        "ActionPayload should have channelId",
      );
      expect(actionRuns[0].actionPayload.channelId).toBe(slackChannel.slackId);
      expect(actionRuns[0].jobStatus).toBe("pending");
    });

    it("should trigger if rule conditions match", async () => {
      const build = await factory.Build.create({
        projectId: project.id,
        conclusion: "changes-detected",
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              type: "build-conclusion",
              value: "changes-detected",
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
    });

    it("should trigger if build mode condition matches", async () => {
      const build = await factory.Build.create({
        projectId: project.id,
        mode: "monitoring",
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              type: "build-mode",
              value: "monitoring",
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
    });

    it("should trigger if build branch glob condition matches", async () => {
      const screenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        branch: "release/2026-05",
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: screenshotBucket.id,
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              glob: {
                type: "build-branch",
                value: "release/*",
              },
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
    });

    it("should not trigger if build branch glob condition does not match", async () => {
      const screenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        branch: "feature/login",
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: screenshotBucket.id,
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              glob: {
                type: "build-branch",
                value: "release/*",
              },
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(0);
    });

    it("should trigger if build branch glob not condition matches", async () => {
      const screenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        branch: "feature/login",
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: screenshotBucket.id,
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              not: {
                glob: {
                  type: "build-branch",
                  value: "release/*",
                },
              },
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
    });

    it("should trigger if build branch exact condition matches", async () => {
      const screenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        branch: "release/2026-05",
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: screenshotBucket.id,
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              type: "build-branch",
              value: "release/2026-05",
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
    });

    it("should not trigger if build branch exact condition does not match", async () => {
      const screenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        branch: "release/2026-05",
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: screenshotBucket.id,
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              type: "build-branch",
              value: "release/*",
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(0);
    });

    it("should trigger if build branch exact not condition matches", async () => {
      const screenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        branch: "feature/login",
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: screenshotBucket.id,
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              not: {
                type: "build-branch",
                value: "release/2026-05",
              },
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
    });

    it("should trigger if rule not conditions match", async () => {
      const build = await factory.Build.create({
        projectId: project.id,
        conclusion: "changes-detected",
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              not: {
                type: "build-conclusion",
                value: "no-changes",
              },
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
    });

    it("should not trigger if rule not conditions do not match", async () => {
      const build = await factory.Build.create({
        projectId: project.id,
        conclusion: "no-changes",
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              not: {
                type: "build-conclusion",
                value: "no-changes",
              },
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(0);
    });

    it("should not create AutomationRun if rule conditions do not match", async () => {
      const build = await factory.Build.create({
        projectId: project.id,
        conclusion: "changes-detected",
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              type: "build-conclusion",
              value: "no-changes",
            },
          ],
        },
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              type: "sendSlackMessage",
              channelId: slackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(0);
    });

    it("should create multiple AutomationRunActionRuns if rule has multiple actions", async () => {
      const otherSlackChannel = await factory.SlackChannel.create();
      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              channelId: slackChannel.slackId,
            },
          },
          {
            action: "sendSlackMessage",
            actionPayload: {
              channelId: otherSlackChannel.slackId,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: await getBuildCompletedMessage(build),
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
      invariant(automationRuns[0], "AutomationRun should be defined");

      const actionRuns = await AutomationActionRun.query().where({
        automationRunId: automationRuns[0].id,
      });
      expect(actionRuns).toHaveLength(2);
      expect((actionRuns[0]?.actionPayload as any).channelId).toBe(
        slackChannel.slackId,
      );
      expect((actionRuns[1]?.actionPayload as any).channelId).toBe(
        otherSlackChannel.slackId,
      );
    });
  });
});
