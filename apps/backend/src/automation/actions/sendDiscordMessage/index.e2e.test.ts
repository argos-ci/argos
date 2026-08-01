import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import { postEmbedToDiscordWebhook } from "@/discord/webhook";

import { automationAction } from ".";

vi.mock("@/discord/webhook", () => ({
  __esModule: true,
  postEmbedToDiscordWebhook: vi.fn(),
}));

const mockPostEmbedToDiscordWebhook = vi.mocked(postEmbedToDiscordWebhook);

describe("sendDiscordMessage", () => {
  beforeEach(async () => {
    await setupDatabase();
    mockPostEmbedToDiscordWebhook.mockClear();
  });

  it("posts an embed with a valid payload", async () => {
    const [project, webhook] = await Promise.all([
      factory.Project.create(),
      factory.DiscordWebhook.create(),
    ]);
    const build = await factory.Build.create({ projectId: project.id });
    const automationRule = await factory.AutomationRule.create();
    const automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });
    const automationActionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "sendDiscordMessage",
      actionPayload: { webhookId: webhook.id },
    });

    await automationAction.process({
      payload: { webhookId: webhook.id },
      ctx: { automationActionRun },
    });

    expect(mockPostEmbedToDiscordWebhook).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        webhook: expect.objectContaining({ id: webhook.id }),
        embed: expect.objectContaining({
          title: expect.any(String),
          url: expect.any(String),
        }),
      }),
    );
  });

  it("fails the action when the webhook has been removed", async () => {
    const project = await factory.Project.create();
    const build = await factory.Build.create({ projectId: project.id });
    const automationRule = await factory.AutomationRule.create();
    const automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });
    const automationActionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "sendDiscordMessage",
      actionPayload: { webhookId: "1234567" },
    });

    await expect(
      automationAction.process({
        payload: { webhookId: "1234567" },
        ctx: { automationActionRun },
      }),
    ).rejects.toThrow("Discord webhook removed");

    expect(mockPostEmbedToDiscordWebhook).not.toHaveBeenCalled();
  });
});
