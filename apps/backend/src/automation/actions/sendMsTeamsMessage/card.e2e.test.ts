import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { buildMsTeamsCard } from "./card";

/**
 * Build the fixtures shared by both events.
 */
async function createBuildFixtures() {
  const account = await factory.TeamAccount.create({ slug: "awesome-team" });
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
  const pr = await factory.PullRequest.create({
    title: "Fix bug with *bold* and [link]",
  });
  const build = await factory.Build.create({
    projectId: project.id,
    type: "check",
    githubPullRequestId: pr.id,
    compareScreenshotBucketId: bucket.id,
  });
  return { build, bucket };
}

describe("buildMsTeamsCard", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("event: build.completed", () => {
    it("returns an Adaptive Card", async () => {
      const { build, bucket } = await createBuildFixtures();

      const card = await buildMsTeamsCard({
        isTestMessage: false,
        message: {
          event: "build.completed",
          payload: { build, compareScreenshotBucket: bucket },
        },
      });

      expect(card.type).toBe("AdaptiveCard");
      expect(card.version).toBe("1.5");
      expect(card.actions).toEqual([
        {
          type: "Action.OpenUrl",
          title: "View build",
          url: "http://localhost:3000/awesome-team/awesome-project/builds/1",
        },
      ]);

      expect(card.body).toMatchObject([
        {
          type: "TextBlock",
          text: "[Build #1](http://localhost:3000/awesome-team/awesome-project/builds/1)",
          weight: "bolder",
        },
        {
          type: "TextBlock",
          text: "Project: **awesome-project**",
        },
        {
          type: "TextBlock",
          text: "✅ No changes detected",
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "PR",
              // The PR title's Markdown must be neutralized.
              value: expect.stringMatching(
                /^\[#99 Fix bug with \\\*bold\\\* and \\\[link\\\]\]\(https:\/\/github\.com\/login-\d+\/repo-\d+\/pull\/99\)$/,
              ),
            },
            {
              title: "Commit",
              value: expect.stringMatching(
                /^\[a5028c0\]\(https:\/\/github\.com\/login-\d+\/repo-\d+\/commit\/a5028c0b1f4d5e2f3a6b7c8d9e0f1d2a3a4a5a6a\)$/,
              ),
            },
            {
              title: "Branch",
              value: expect.stringMatching(
                /^\[master\]\(https:\/\/github\.com\/login-\d+\/repo-\d+\/tree\/master\)$/,
              ),
            },
          ],
        },
      ]);
    });

    it("prepends a disclaimer for test messages", async () => {
      const { build, bucket } = await createBuildFixtures();

      const card = await buildMsTeamsCard({
        isTestMessage: true,
        message: {
          event: "build.completed",
          payload: { build, compareScreenshotBucket: bucket },
        },
      });

      expect(card.body[0]).toMatchObject({
        type: "TextBlock",
        text: expect.stringContaining("test message"),
      });
    });
  });

  describe("event: build.reviewed", () => {
    it("returns an Adaptive Card with the review state", async () => {
      const { build, bucket } = await createBuildFixtures();
      const buildReview = await factory.BuildReview.create({
        buildId: build.id,
        state: "approved",
      });

      const card = await buildMsTeamsCard({
        isTestMessage: false,
        message: {
          event: "build.reviewed",
          payload: {
            build,
            compareScreenshotBucket: bucket,
            buildReview,
          },
        },
      });

      expect(card.body).toMatchObject([
        {
          type: "TextBlock",
          text: "[Build #1](http://localhost:3000/awesome-team/awesome-project/builds/1)",
        },
        {
          type: "TextBlock",
          text: "Project: **awesome-project**",
        },
        {
          type: "TextBlock",
          text: "👍 Approved by Unknown",
        },
        { type: "FactSet" },
      ]);
    });
  });
});
