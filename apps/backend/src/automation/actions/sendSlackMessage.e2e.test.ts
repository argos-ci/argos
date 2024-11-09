import { beforeEach, describe, expect, it, vi } from "vitest";

import { AutomationActionRun } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { postMessageToSlackChannel } from "../../slack";
import { sendSlackMessage } from "./sendSlackMessage";

vi.mock("../../slack", () => ({
  __esModule: true,
  postMessageToSlackChannel: vi.fn(),
}));

const mockPostMessageToSlackChannel = vi.mocked(postMessageToSlackChannel);

describe("sendSlackMessage", () => {
  beforeEach(async () => {
    await setupDatabase();
    mockPostMessageToSlackChannel.mockClear();
  });

  it("sends a Slack message and marks task as success", async () => {
    const [project, slackChannel] = await Promise.all([
      factory.Project.create(),
      factory.SlackChannel.create(),
    ]);
    const build = await factory.Build.create({ projectId: project.id });
    const automationRule = await factory.AutomationRule.create();
    const automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });
    const automationActionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      actionPayload: { channelId: slackChannel.id },
    });
    await sendSlackMessage({
      channelId: slackChannel.id,
      ctx: { automationActionRun },
    });
    expect(mockPostMessageToSlackChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.any(String),
        blocks: expect.any(Array),
      }),
    );
    const updatedTask = await AutomationActionRun.query().findById(
      automationActionRun.id,
    );
    expect(updatedTask?.conclusion).toBe("success");
    expect(updatedTask?.completedAt).not.toBeNull();
  });

  it("marks task as failed if Slack channel is missing", async () => {
    const project = await factory.Project.create();
    const build = await factory.Build.create({ projectId: project.id });
    const automationRun = await factory.AutomationRun.create({
      buildId: build.id,
    });
    const automationActionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      actionPayload: { channelId: "5555" },
    });

    await sendSlackMessage({
      channelId: "1234",
      ctx: { automationActionRun },
    });
    expect(mockPostMessageToSlackChannel).not.toHaveBeenCalled();
    const updatedTask = await AutomationActionRun.query().findById(
      automationActionRun.id,
    );
    expect(updatedTask?.conclusion).toBe("failed");
    expect(updatedTask?.failureReason).toContain("Slack channel removed");
    expect(updatedTask?.jobStatus).toBe("complete");
  });
});
