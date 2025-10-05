import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import { postMessageToSlackChannel } from "@/slack/channel.js";

import { automationAction } from "./index";

vi.mock("@/slack/channel.js", () => ({
  __esModule: true,
  postMessageToSlackChannel: vi.fn(),
}));

const mockPostMessageToSlackChannel = vi.mocked(postMessageToSlackChannel);

describe("sendSlackMessage", () => {
  beforeEach(async () => {
    await setupDatabase();
    mockPostMessageToSlackChannel.mockClear();
  });

  it("sends a Slack message with valid payload", async () => {
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
      actionPayload: { channelId: slackChannel.slackId },
    });
    await automationAction.process({
      payload: { channelId: slackChannel.slackId },
      ctx: { automationActionRun },
    });
    expect(mockPostMessageToSlackChannel).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        text: expect.any(String),
        blocks: expect.any(Array),
      }),
    );
  });

  it("throws if Slack channel does not exist", async () => {
    const [project] = await Promise.all([factory.Project.create()]);
    const build = await factory.Build.create({ projectId: project.id });
    const automationRule = await factory.AutomationRule.create();
    const automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });
    const automationActionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      actionPayload: { channelId: "nonexistent-channel" },
    });

    await expect(
      automationAction.process({
        payload: { channelId: "1245" },
        ctx: { automationActionRun },
      }),
    ).rejects.toThrow("Slack channel removed");
  });
});
