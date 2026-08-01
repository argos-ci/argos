import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { buildDiscordEmbed } from "./embed";

/**
 * Build the fixtures shared by both events.
 */
async function createBuildFixtures(props?: { pullRequestTitle?: string }) {
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
    title: props?.pullRequestTitle ?? "Fix bug with *bold* and [link]",
  });
  const build = await factory.Build.create({
    projectId: project.id,
    type: "check",
    githubPullRequestId: pr.id,
    compareScreenshotBucketId: bucket.id,
  });
  return { build, bucket };
}

describe("buildDiscordEmbed", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("event: build.completed", () => {
    it("returns an embed", async () => {
      const { build, bucket } = await createBuildFixtures();

      const embed = await buildDiscordEmbed({
        isTestMessage: false,
        message: {
          event: "build.completed",
          payload: { build, compareScreenshotBucket: bucket },
        },
      });

      // The build link is the embed's own `url` — titles render as plain text,
      // so a Markdown link there would show up verbatim.
      expect(embed.title).toBe("Build #1");
      expect(embed.url).toBe(
        "http://localhost:3000/awesome-team/awesome-project/builds/1",
      );
      expect(embed.author).toEqual({ name: "Project: awesome-project" });
      expect(embed.description).toBe("✅ No changes detected");
      expect(embed.footer).toBeUndefined();

      expect(embed.fields).toMatchObject([
        {
          name: "Commit",
          value: expect.stringMatching(
            /^\[a5028c0\]\(https:\/\/github\.com\/login-\d+\/repo-\d+\/commit\/a5028c0b1f4d5e2f3a6b7c8d9e0f1d2a3a4a5a6a\)$/,
          ),
          inline: true,
        },
        {
          name: "Branch",
          value: expect.stringMatching(
            /^\[master\]\(https:\/\/github\.com\/login-\d+\/repo-\d+\/tree\/master\)$/,
          ),
          inline: true,
        },
        {
          name: "PR",
          // The PR title's Markdown must be neutralized.
          value: expect.stringMatching(
            /^\[#99 Fix bug with \\\*bold\\\* and \\\[link\\\]\]\(https:\/\/github\.com\/login-\d+\/repo-\d+\/pull\/99\)$/,
          ),
        },
      ]);

      // The PR is the only field left off the inline row: its title is too long
      // to read in a third of the embed width.
      expect(embed.fields?.at(-1)?.inline).toBeUndefined();
    });

    // Discord rejects the whole message when a field value exceeds 1024
    // characters, so a verbose PR title must be trimmed, not passed through.
    it("truncates an overlong PR title", async () => {
      const { build, bucket } = await createBuildFixtures({
        // The longest title the model accepts.
        pullRequestTitle: "a".repeat(255),
      });

      const embed = await buildDiscordEmbed({
        isTestMessage: false,
        message: {
          event: "build.completed",
          payload: { build, compareScreenshotBucket: bucket },
        },
      });

      const prField = embed.fields?.find((field) => field.name === "PR");
      expect(prField?.value.length).toBeLessThanOrEqual(1024);
      expect(prField?.value).toContain("…");
    });

    it("puts the disclaimer in the footer for test messages", async () => {
      const { build, bucket } = await createBuildFixtures();

      const embed = await buildDiscordEmbed({
        isTestMessage: true,
        message: {
          event: "build.completed",
          payload: { build, compareScreenshotBucket: bucket },
        },
      });

      expect(embed.footer?.text).toContain("test message");
    });
  });

  describe("event: build.reviewed", () => {
    it("returns an embed with the review state", async () => {
      const { build, bucket } = await createBuildFixtures();
      const buildReview = await factory.BuildReview.create({
        buildId: build.id,
        state: "approved",
      });

      const embed = await buildDiscordEmbed({
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

      expect(embed.title).toBe("Build #1");
      expect(embed.author).toEqual({ name: "Project: awesome-project" });
      expect(embed.description).toBe("👍 Approved by Unknown");
    });
  });
});
