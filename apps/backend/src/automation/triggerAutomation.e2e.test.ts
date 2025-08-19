import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import {
  AutomationActionRun,
  AutomationRun,
  Build,
  Project,
  SlackChannel,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { triggerAutomation } from "./triggerAutomation";
import { AutomationEvents } from "./types/events";

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
              channelId: slackChannel.id,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: {
          event: AutomationEvents.BuildCompleted,
          payload: { build },
        },
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
      expect(actionRuns[0].actionPayload.channelId).toBe(slackChannel.id);
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
              channelId: slackChannel.id,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: {
          event: AutomationEvents.BuildCompleted,
          payload: { build },
        },
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
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
              channelId: slackChannel.id,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: {
          event: AutomationEvents.BuildCompleted,
          payload: { build },
        },
      });

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(0);
    });

    it("should create multiple AutomationActionRuns if rule has multiple actions", async () => {
      const otherSlackChannel = await factory.SlackChannel.create();
      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {
              channelId: slackChannel.id,
            },
          },
          {
            action: "sendSlackMessage",
            actionPayload: {
              channelId: otherSlackChannel.id,
            },
          },
        ],
      });

      await triggerAutomation({
        projectId: project.id,
        message: {
          event: AutomationEvents.BuildCompleted,
          payload: { build },
        },
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
        slackChannel.id,
      );
      expect((actionRuns[1]?.actionPayload as any).channelId).toBe(
        otherSlackChannel.id,
      );
    });
  });
});
