import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { AutomationActionRun, AutomationRun } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { triggerAutomation } from "./triggerAutomation";
import { AutomationEvent } from "./types/events";

describe("automation/triggerAutomation", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("triggerAutomation", () => {
    it("should create AutomationRun and AutomationActionRun when rule matches", async () => {
      const project = await factory.Project.create();
      const build = await factory.Build.create({ projectId: project.id });
      const slackInstallation = await factory.SlackInstallation.create({
        teamId: project.id,
      });
      const slackChannel = await factory.SlackChannel.create({
        slackInstallationId: slackInstallation.id,
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              type: "build-conclusion",
              value: build.conclusion,
            },
          ],
        },
        then: [
          {
            type: "send_slack_message",
            payload: {
              channelId: slackChannel.id,
              message: { text: "Hello from automation!" },
            },
          },
        ],
      });

      await triggerAutomation(
        project.id,
        AutomationEvent.BuildCompleted,
        build,
      );

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
      invariant(automationRuns[0], "AutomationRun should have an ID");

      const actionRuns = await AutomationActionRun.query().where({
        automationRunId: automationRuns[0].id,
      });
      expect(actionRuns).toHaveLength(1);
      invariant(actionRuns[0], "AutomationActionRun should have an ID");
      expect(actionRuns[0].action).toBe("send_slack_message");
      invariant(
        "channelId" in actionRuns[0].actionPayload,
        "ActionPayload should have channelId",
      );
      expect(actionRuns[0].actionPayload.channelId).toBe(slackChannel.id);
      expect(actionRuns[0].jobStatus).toBe("pending");
    });

    it("should not create AutomationRun if rule conditions do not match", async () => {
      const project = await factory.Project.create();
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
              type: "build-conclusion",
              value: "changes-detected", // purposely not matching
            },
          ],
        },
        then: [
          {
            type: "send_slack_message",
            payload: {
              channelId: "fake-channel-id",
              message: { text: "Should not trigger" },
            },
          },
        ],
      });

      await triggerAutomation(
        project.id,
        AutomationEvent.BuildCompleted,
        build,
      );

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(0);

      const actionRuns = await AutomationActionRun.query();
      expect(actionRuns).toHaveLength(0);
    });

    it("should create multiple AutomationActionRuns if rule has multiple actions", async () => {
      const project = await factory.Project.create();
      const build = await factory.Build.create({ projectId: project.id });
      const slackInstallation = await factory.SlackInstallation.create({
        teamId: project.id,
      });
      const slackChannel = await factory.SlackChannel.create({
        slackInstallationId: slackInstallation.id,
      });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              type: "build-conclusion",
              value: build.conclusion,
            },
          ],
        },
        then: [
          {
            type: "send_slack_message",
            payload: {
              channelId: slackChannel.id,
              message: { text: "First action" },
            },
          },
          {
            type: "send_slack_message",
            payload: {
              channelId: slackChannel.id,
              message: { text: "Second action" },
            },
          },
        ],
      });

      await triggerAutomation(
        project.id,
        AutomationEvent.BuildCompleted,
        build,
      );

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
      invariant(automationRuns[0], "AutomationRun should have an ID");
      const actionRuns = await AutomationActionRun.query().where({
        automationRunId: automationRuns[0].id,
      });
      expect(actionRuns).toHaveLength(2);
    });

    it("should handle unknown action types gracefully", async () => {
      const project = await factory.Project.create();
      const build = await factory.Build.create({ projectId: project.id });

      const automationRule = await factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        if: {
          all: [
            {
              type: "build-conclusion",
              value: build.conclusion,
            },
          ],
        },
        then: [
          {
            type: "unknown_action_type",
            payload: { foo: "bar" },
          },
        ],
      });

      await triggerAutomation(
        project.id,
        AutomationEvent.BuildCompleted,
        build,
      );

      const automationRuns = await AutomationRun.query().where({
        automationRuleId: automationRule.id,
        buildId: build.id,
      });
      expect(automationRuns).toHaveLength(1);
      invariant(automationRuns[0], "AutomationRun should have an ID");
      const actionRuns = await AutomationActionRun.query().where({
        automationRunId: automationRuns[0].id,
      });
      expect(actionRuns).toHaveLength(1);
      expect(actionRuns[0]?.action).toBe("unknown_action_type");
      expect(actionRuns[0]?.jobStatus).toBe("pending");
    });
  });
});
