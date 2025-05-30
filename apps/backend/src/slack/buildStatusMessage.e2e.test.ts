import { beforeEach, describe, expect, it } from "vitest";

import { AutomationEvents } from "@/automation/types/events.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { getBuildStatusMessage } from "./buildStatusMessage";

describe("getBuildStatusMessage", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("formats a full message with all fields", async () => {
    const account = await factory.TeamAccount.create({
      slug: "awesome-team",
    });
    const project = await factory.Project.create({
      accountId: account.id,
    });
    const compareScreenshotBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      commit: "a5028c0b1f4d5e2f3a6b7c8d9e0f1d2a3a4a5a6a",
      screenshotCount: 12,
    });
    const [build, pullRequest] = await Promise.all([
      factory.Build.create({ projectId: project.id, type: "check" }),
      factory.PullRequest.create(),
    ]);
    const buildUrl = await build.getUrl();
    const event = AutomationEvents.BuildCompleted;

    const slackBlocks = getBuildStatusMessage({
      build,
      buildUrl,
      compareScreenshotBucket,
      project,
      pullRequest,
      event,
    });

    const expectedBlocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Build complete",
          emoji: true,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "<http://localhost:3000/awesome-team/awesome-project/builds/1|Build #1: default> on *awesome-project*",
          },
        ],
      },
      {
        type: "divider",
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Type:* check",
          },
          {
            type: "mrkdwn",
            text: "*Commit:* a5028c0",
          },
          {
            type: "mrkdwn",
            text: "*Branch:* master",
          },
          {
            type: "mrkdwn",
            text: "*Screenshots:* 12",
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Pull Request:* <https://github.com/pull/99|#99: Fix bug>",
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Build",
            },
            url: "http://localhost:3000/awesome-team/awesome-project/builds/1",
            action_id: "view-build-button",
            style: "primary",
          },
        ],
      },
    ];

    expect(slackBlocks).toMatchObject(expectedBlocks);
  });
});
