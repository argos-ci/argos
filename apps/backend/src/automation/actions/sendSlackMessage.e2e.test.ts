import { beforeEach, describe, expect, it, vi } from "vitest";

import { AutomationActionRun } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { postMessageToSlackChannel } from "../../slack";
import { processSendSlackMessageAction } from "./sendSlackMessage";

vi.mock("@/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../slack", () => ({
  __esModule: true,
  postMessageToSlackChannel: vi.fn(),
}));

vi.mock("../../slack/buildStatusMessage", () => ({
  getBuildStatusMessage: vi.fn(() => [
    { type: "section", text: { type: "mrkdwn", text: "msg" } },
  ]),
}));

const mockPostMessageToSlackChannel = vi.mocked(postMessageToSlackChannel);

describe("processSendSlackMessageAction", () => {
  beforeEach(async () => {
    await setupDatabase();
    mockPostMessageToSlackChannel.mockClear();
  });

  it("sends a Slack message and marks task as success", async () => {
    const project = await factory.Project.create();
    const build = await factory.Build.create({ projectId: project.id });
    const automationRun = await factory.AutomationRun.create({
      buildId: build.id,
    });
    const slackInstallation = await factory.SlackInstallation.create({
      teamId: project.id,
    });
    const slackChannel = await factory.SlackChannel.create({
      slackInstallationId: slackInstallation.id,
      slackId: "SLACK123",
    });
    const ActionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "send_slack_message",
      actionPayload: { channelId: slackChannel.id },
    });

    await processSendSlackMessageAction(ActionRun);

    expect(mockPostMessageToSlackChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        installation: expect.objectContaining({ id: slackInstallation.id }),
        channel: "SLACK123",
        text: expect.any(String),
        blocks: expect.any(Array),
      }),
    );

    const updatedTask = await AutomationActionRun.query().findById(
      ActionRun.id,
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
    const ActionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "send_slack_message",
      actionPayload: { channelId: "1234" },
    });

    await processSendSlackMessageAction(ActionRun);

    expect(mockPostMessageToSlackChannel).not.toHaveBeenCalled();
    const updatedTask = await AutomationActionRun.query().findById(
      ActionRun.id,
    );
    expect(updatedTask?.conclusion).toBe("failed");
    expect(updatedTask?.failureReason).toContain("Slack channel removed");
    expect(updatedTask?.jobStatus).toBe("complete");
  });

  it("throws if channelId is missing in payload", async () => {
    const project = await factory.Project.create();
    const build = await factory.Build.create({ projectId: project.id });
    const automationRun = await factory.AutomationRun.create({
      buildId: build.id,
    });
    const ActionRun = await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "send_slack_message",
      actionPayload: {
        channelId: null,
      },
    });

    await expect(() =>
      processSendSlackMessageAction(ActionRun),
    ).rejects.toThrow(/Missing channelId/);
  });
});
