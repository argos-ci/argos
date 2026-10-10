import { beforeEach, describe, expect, it } from "vitest";

import { knex } from "@/database";
import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getMonthlyReportActivity } from "./monthly-report-activity";

const at = (iso: string) => new Date(iso).toISOString();

// The month that just closed is September 15 to October 15.
const months = [
  { startsAt: "2026-08-15T00:00:00.000Z", projected: false },
  { startsAt: "2026-09-15T00:00:00.000Z", projected: false },
  { startsAt: "2026-10-15T00:00:00.000Z", projected: true },
];
const termEndsAt = "2027-01-15T00:00:00.000Z";

describe("getMonthlyReportActivity", () => {
  let account: Account;
  let project: Project;

  beforeEach(async () => {
    await setupDatabase();
    account = await factory.TeamAccount.create();
    project = await factory.Project.create({
      accountId: account.id,
      name: "web",
    });
  });

  async function createFlakyTest() {
    const test = await factory.Test.create({
      projectId: project.id,
      name: "flaky",
    });
    // The same change on three days out of ten builds: unstable, and never
    // a new change, so flaky.
    await knex("test_stats_builds").insert({
      testId: test.id,
      date: at("2026-09-16T00:00:00Z"),
      value: 10,
    });
    await knex("test_stats_fingerprints").insert(
      [16, 17, 18].map((day) => ({
        testId: test.id,
        fingerprint: "fp",
        date: at(`2026-09-${day}T00:00:00Z`),
        value: 1,
      })),
    );
    return test;
  }

  async function createPullRequestBuild(input: {
    pullRequestId: string;
    commit: string;
    name?: string;
    createdAt: string;
    conclusion: "changes-detected" | "no-changes";
  }) {
    const bucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      name: input.name ?? "default",
      // A full sha, as the model requires.
      commit: input.commit.padEnd(40, "0"),
      createdAt: at(input.createdAt),
    });
    return factory.Build.create({
      projectId: project.id,
      name: input.name ?? "default",
      compareScreenshotBucketId: bucket.id,
      createdAt: at(input.createdAt),
      concludedAt: at(input.createdAt),
      conclusion: input.conclusion,
      type: "check",
      githubPullRequestId: input.pullRequestId,
    });
  }

  it("counts the pull requests fixed after a change was flagged, flaky tests left out", async () => {
    const flaky = await createFlakyTest();
    const stable = await factory.Test.create({
      projectId: project.id,
      name: "stable",
    });

    // Fixed: a real change flagged, then a clean build. Its two commits ran
    // under two build names, and still count as one intermediate commit.
    const fixed = await factory.PullRequest.create();
    const flagged = await createPullRequestBuild({
      pullRequestId: fixed.id,
      commit: "a1",
      createdAt: "2026-09-20T10:00:00Z",
      conclusion: "changes-detected",
    });
    await factory.ScreenshotDiff.create({
      buildId: flagged.id,
      score: 0.3,
      testId: stable.id,
    });
    await createPullRequestBuild({
      pullRequestId: fixed.id,
      commit: "a1",
      name: "storybook",
      createdAt: "2026-09-20T10:05:00Z",
      conclusion: "no-changes",
    });
    await createPullRequestBuild({
      pullRequestId: fixed.id,
      commit: "a2",
      createdAt: "2026-09-21T10:00:00Z",
      conclusion: "no-changes",
    });

    // Not fixed: the only change came from a flaky test.
    const noisy = await factory.PullRequest.create();
    const noisyBuild = await createPullRequestBuild({
      pullRequestId: noisy.id,
      commit: "b1",
      createdAt: "2026-09-22T10:00:00Z",
      conclusion: "changes-detected",
    });
    await factory.ScreenshotDiff.create({
      buildId: noisyBuild.id,
      score: 0.3,
      testId: flaky.id,
    });
    await createPullRequestBuild({
      pullRequestId: noisy.id,
      commit: "b2",
      createdAt: "2026-09-23T10:00:00Z",
      conclusion: "no-changes",
    });

    const activity = await getMonthlyReportActivity(
      account,
      months,
      termEndsAt,
    );

    expect(activity?.pullRequests).toEqual({
      checked: 2,
      fixedAfterFlag: 1,
      intermediateCommits: 2,
    });
    expect(activity?.flakyTests.current).toBe(1);
    expect(activity?.flakyTests.top.map((test) => test.name)).toEqual([
      "flaky",
    ]);
  });

  it("counts the changes people reviewed and the tests covered", async () => {
    const build = await factory.Build.create({
      projectId: project.id,
      createdAt: at("2026-09-20T10:00:00Z"),
      conclusion: "changes-detected",
      type: "check",
    });
    const diffs = await factory.ScreenshotDiff.createMany(3, {
      buildId: build.id,
      score: 0.4,
    });
    const [first, second, third] = diffs.map((diff) => diff.id);
    const review = (state: "approved" | "rejected", automatic = false) =>
      factory.BuildReview.create({ buildId: build.id, state, automatic });
    const alice = await review("approved");
    const bob = await review("rejected");
    const robot = await review("approved", true);
    await factory.ScreenshotDiffReview.createMany(4, [
      { buildReviewId: alice.id, screenshotDiffId: first },
      { buildReviewId: alice.id, screenshotDiffId: second },
      // Reviewed twice, counted once.
      { buildReviewId: bob.id, screenshotDiffId: first, state: "rejected" },
      // An automatic approval is not a person reviewing.
      { buildReviewId: robot.id, screenshotDiffId: third },
    ]);

    const [known, fresh, gone] = await factory.Test.createMany(3, [
      { projectId: project.id, name: "known" },
      { projectId: project.id, name: "fresh" },
      { projectId: project.id, name: "gone" },
    ]);
    await knex("test_stats_builds").insert([
      { testId: known?.id, date: at("2026-08-01T00:00:00Z"), value: 1 },
      { testId: known?.id, date: at("2026-09-16T00:00:00Z"), value: 1 },
      { testId: fresh?.id, date: at("2026-09-20T00:00:00Z"), value: 1 },
      { testId: gone?.id, date: at("2026-08-02T00:00:00Z"), value: 1 },
    ]);

    const activity = await getMonthlyReportActivity(
      account,
      months,
      termEndsAt,
    );

    expect(activity?.changesReviewed).toEqual({ current: 2, previous: 0 });
    expect(activity?.tests).toEqual({ covered: 2, added: 1 });
  });

  it("names the build name whose screenshots grew the most", async () => {
    const bucket = (name: string, createdAt: string, screenshotCount: number) =>
      factory.ScreenshotBucket.create({
        projectId: project.id,
        name,
        createdAt: at(createdAt),
        screenshotCount,
        storybookScreenshotCount: 0,
      });
    await bucket("e2e", "2026-08-20T10:00:00Z", 1000);
    await bucket("e2e", "2026-09-20T10:00:00Z", 1500);
    // Tripled, but by far less in volume.
    await bucket("storybook", "2026-08-20T10:00:00Z", 100);
    await bucket("storybook", "2026-09-20T10:00:00Z", 300);
    // New this month: nothing to compare it with.
    await bucket("mobile", "2026-09-20T10:00:00Z", 5000);

    const activity = await getMonthlyReportActivity(
      account,
      months,
      termEndsAt,
    );

    expect(activity?.screenshots.biggestIncrease).toEqual({
      label: "e2e",
      screenshots: 1500,
      previous: 1000,
    });
  });
});
