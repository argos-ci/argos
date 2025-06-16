import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing/index.js";

import { Build } from "../database/models";
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
      project.$fetchGraph(`[githubRepository.githubAccount,gitlabProject]`),
    ]);

    const [buildUrl, [status]] = await Promise.all([
      build.getUrl(),
      Build.getAggregatedBuildStatuses([build]),
    ]);

    invariant(status, "Status should be loaded");

    const slackBlocks = getBuildStatusMessage({
      build,
      buildUrl,
      compareScreenshotBucket,
      project,
      pullRequest,
      status,
    });

    const expectedBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*<http://localhost:3000/awesome-team/awesome-project/builds/1|Build #1>*",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Project: *awesome-project*",
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "✅ No changes detected",
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*PR:* <https://github.com/pull/99|#99> Fix bug",
          },
          {
            type: "mrkdwn",
            text: expect.stringMatching(
              /\*Commit:\* <https:\/\/github\.com\/login-\d+\/repo-\d+\/commit\/a5028c0b1f4d5e2f3a6b7c8d9e0f1d2a3a4a5a6a\|a5028c0>/,
            ),
          },
          {
            type: "mrkdwn",
            text: expect.stringMatching(
              /\*Branch:\* <https:\/\/github\.com\/login-\d+\/repo-\d+\/tree\/master\|master>/,
            ),
          },
        ],
      },
    ];

    expect(slackBlocks).toMatchObject(expectedBlocks);
  });
});
