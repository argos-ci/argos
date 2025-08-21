import { beforeEach, describe, expect, it, vi } from "vitest";

import { processAutomationActionRun } from "@/automation/job";
import {
  AutomationActionRun,
  Build,
  Project,
  SlackChannel,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { postMessageToSlackChannel } from "@/slack/channel";

vi.mock("@/slack/channel", () => ({
  __esModule: true,
  postMessageToSlackChannel: vi.fn(),
}));

const mockPostMessageToSlackChannel = vi.mocked(postMessageToSlackChannel);

describe("automation/job", () => {
  let project: Project;
  let build: Build;
  let slackChannel: SlackChannel;

  beforeEach(async () => {
    await setupDatabase();
    mockPostMessageToSlackChannel.mockClear();
    project = await factory.Project.create();
    build = await factory.Build.create({ projectId: project.id });
    slackChannel = await factory.SlackChannel.create();
  });

  it("should complete AutomationActionRun with success if action succeeds", async () => {
    const automationRule = await factory.AutomationRule.create({
      projectId: project.id,
      on: ["build.completed"],
      then: [
        {
          action: "sendSlackMessage",
          actionPayload: { channelId: slackChannel.slackId },
        },
      ],
    });
    const automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });
    const actionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "sendSlackMessage",
      actionPayload: { channelId: slackChannel.slackId },
      jobStatus: "pending",
    });
    await processAutomationActionRun(actionRun);
    const updatedActionRun = await AutomationActionRun.query().findById(
      actionRun.id,
    );
    expect(updatedActionRun?.jobStatus).toBe("complete");
    expect(updatedActionRun?.conclusion).toBe("success");
    expect(updatedActionRun?.completedAt).toBeTruthy();
  });

  it("should set conclusion to failed and set failureReason if action throws AutomationActionFailureError", async () => {
    // Use a non-existent slack channel to force failure
    const automationRule = await factory.AutomationRule.create({
      projectId: project.id,
      on: ["build.completed"],
      then: [
        {
          action: "sendSlackMessage",
          actionPayload: { channelId: "1234" },
        },
      ],
    });
    const automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });
    const actionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "sendSlackMessage",
      actionPayload: { channelId: "1234" },
      jobStatus: "pending",
    });
    await processAutomationActionRun(actionRun);
    const updatedActionRun = await AutomationActionRun.query().findById(
      actionRun.id,
    );
    expect(updatedActionRun?.jobStatus).toBe("complete");
    expect(updatedActionRun?.conclusion).toBe("failed");
    expect(updatedActionRun?.failureReason).toMatch(/Slack channel removed/);
  });

  it("should throw if action payload does not match schema", async () => {
    await expect(
      factory.AutomationRule.create({
        projectId: project.id,
        on: ["build.completed"],
        then: [
          {
            action: "sendSlackMessage",
            actionPayload: {},
          },
        ],
      }),
    ).rejects.toThrow(/must have required property 'channelId'/);
  });
});
