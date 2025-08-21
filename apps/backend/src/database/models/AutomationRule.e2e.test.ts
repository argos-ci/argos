import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing/index.js";

import { AutomationRule } from "./AutomationRule";
import { Project } from "./Project";
import { SlackChannel } from "./SlackChannel";

function getBaseData(project: Project, slackChannel: SlackChannel) {
  return {
    active: true,
    name: "Slack notification on build changes",
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
          channelId: slackChannel.slackId,
        },
      },
    ],
  };
}

describe("AutomationRule", () => {
  let project: Project;
  let slackChannel: SlackChannel;

  beforeEach(async () => {
    await setupDatabase();
    const data = await Promise.all([
      factory.Project.create(),
      factory.SlackChannel.create(),
    ]);
    project = data[0];
    slackChannel = data[1];
  });

  describe("create", () => {
    it("should inserts with correct data", async () => {
      const baseData = getBaseData(project, slackChannel);
      const rule = await AutomationRule.query().insert(baseData as any);
      expect(rule).toMatchObject({
        active: true,
        name: "Slack notification on build changes",
        on: baseData.on,
        if: baseData.if,
        then: baseData.then,
        projectId: project.id,
      });
    });

    it("should reject unknown action", async () => {
      await expect(
        factory.AutomationRule.create({
          projectId: project.id,
          then: [
            {
              action: "unknownAction",
              actionPayload: {
                channelId: slackChannel.slackId,
              },
            },
          ],
        }),
      ).rejects.toThrow(
        "then.0.action: must be equal to constant, then.0: must match a schema in anyOf",
      );
    });
  });
});
