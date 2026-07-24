import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import { postCardToMsTeamsWebhook } from "@/msteams/webhook";

import { automationAction } from ".";

vi.mock("@/msteams/webhook", () => ({
  __esModule: true,
  postCardToMsTeamsWebhook: vi.fn(),
}));

const mockPostCardToMsTeamsWebhook = vi.mocked(postCardToMsTeamsWebhook);

describe("sendMsTeamsMessage", () => {
  beforeEach(async () => {
    await setupDatabase();
    mockPostCardToMsTeamsWebhook.mockClear();
  });

  it("posts an Adaptive Card with a valid payload", async () => {
    const [project, webhook] = await Promise.all([
      factory.Project.create(),
      factory.MsTeamsWebhook.create(),
    ]);
    const build = await factory.Build.create({ projectId: project.id });
    const automationRule = await factory.AutomationRule.create();
    const automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });
    const automationActionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "sendMsTeamsMessage",
      actionPayload: { webhookId: webhook.id },
    });

    await automationAction.process({
      payload: { webhookId: webhook.id },
      ctx: { automationActionRun },
    });

    expect(mockPostCardToMsTeamsWebhook).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        webhook: expect.objectContaining({ id: webhook.id }),
        card: expect.objectContaining({
          type: "AdaptiveCard",
          body: expect.any(Array),
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
      action: "sendMsTeamsMessage",
      actionPayload: { webhookId: "1234567" },
    });

    await expect(
      automationAction.process({
        payload: { webhookId: "1234567" },
        ctx: { automationActionRun },
      }),
    ).rejects.toThrow("Microsoft Teams webhook removed");

    expect(mockPostCardToMsTeamsWebhook).not.toHaveBeenCalled();
  });
});
