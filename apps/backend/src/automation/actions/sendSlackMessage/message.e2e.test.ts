import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing/index.js";

import { buildSlackMessage } from "./message";

describe("buildSlackMessage", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("event: build.completed", () => {
    it("returns text and blocks", async () => {
      const account = await factory.TeamAccount.create({
        slug: "awesome-team",
      });
      const repo = await factory.GithubRepository.create();
      const project = await factory.Project.create({
        accountId: account.id,
        githubRepositoryId: repo.id,
      });
      const bucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        commit: "a5028c0b1f4d5e2f3a6b7c8d9e0f1d2a3a4a5a6a",
        screenshotCount: 12,
      });
      const pr = await factory.PullRequest.create();
      const build = await factory.Build.create({
        projectId: project.id,
        type: "check",
        githubPullRequestId: pr.id,
        compareScreenshotBucketId: bucket.id,
      });

      const slackMessage = await buildSlackMessage({
        isTestMessage: false,
        message: {
          event: "build.completed",
          payload: { build },
        },
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

      expect(slackMessage.text).toMatchInlineSnapshot(`"Build #1 completed"`);
      expect(slackMessage.blocks).toMatchObject(expectedBlocks);
    });
  });

  describe("event: build.reviewed", () => {
    it("returns text and blocks", async () => {
      const account = await factory.TeamAccount.create({
        slug: "awesome-team",
      });
      const repo = await factory.GithubRepository.create();
      const project = await factory.Project.create({
        accountId: account.id,
        githubRepositoryId: repo.id,
      });
      const bucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        commit: "a5028c0b1f4d5e2f3a6b7c8d9e0f1d2a3a4a5a6a",
        screenshotCount: 12,
      });
      const pr = await factory.PullRequest.create();
      const build = await factory.Build.create({
        projectId: project.id,
        type: "check",
        githubPullRequestId: pr.id,
        compareScreenshotBucketId: bucket.id,
      });
      const buildReview = await factory.BuildReview.create({
        buildId: build.id,
        state: "approved",
      });

      const slackMessage = await buildSlackMessage({
        isTestMessage: false,
        message: {
          event: "build.reviewed",
          payload: { build, buildReview },
        },
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
          text: {
            text: "👍 Approved by Unknown",
            type: "mrkdwn",
          },
          type: "section",
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

      expect(slackMessage.text).toMatchInlineSnapshot(
        `"Build #1 has been approved"`,
      );
      expect(slackMessage.blocks).toMatchObject(expectedBlocks);
    });
  });
});
