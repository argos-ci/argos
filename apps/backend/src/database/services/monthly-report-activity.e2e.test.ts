import { beforeEach, describe, expect, it } from "vitest";

import { knex } from "@/database";
import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getMonthlyReportActivity } from "./monthly-report-activity";

// The month that just closed is September 15 to October 15.
const windows = {
  current: {
    from: new Date("2026-09-15T00:00:00.000Z"),
    to: new Date("2026-10-15T00:00:00.000Z"),
  },
  previous: {
    from: new Date("2026-08-15T00:00:00.000Z"),
    to: new Date("2026-09-15T00:00:00.000Z"),
  },
};

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
      date: "2026-09-16T00:00:00Z",
      value: 10,
    });
    await knex("test_stats_fingerprints").insert(
      [16, 17, 18].map((day) => ({
        testId: test.id,
        fingerprint: "fp",
        date: `2026-09-${day}T00:00:00Z`,
        value: 1,
      })),
    );
    return test;
  }

  async function createPullRequestBuild(input: {
    pullRequestId: string | null;
    commit: string;
    name?: string;
    createdAt: string;
    conclusion: "changes-detected" | "no-changes";
    mode?: "ci" | "monitoring";
    subset?: boolean;
  }) {
    const name = input.name ?? "default";
    const bucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      name,
      // A full sha, as the model requires.
      commit: input.commit.padEnd(40, "0"),
      createdAt: input.createdAt,
    });
    return factory.Build.create({
      projectId: project.id,
      name,
      compareScreenshotBucketId: bucket.id,
      createdAt: input.createdAt,
      concludedAt: input.createdAt,
      conclusion: input.conclusion,
      type: "check",
      githubPullRequestId: input.pullRequestId,
      mode: input.mode ?? "ci",
      subset: input.subset ?? false,
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

    // Not fixed: the only change came from a flaky test. The screenshots a
    // subset build did not take are not changes either.
    const noisy = await factory.PullRequest.create();
    const noisyBuild = await createPullRequestBuild({
      pullRequestId: noisy.id,
      commit: "b1",
      createdAt: "2026-09-22T10:00:00Z",
      conclusion: "changes-detected",
      subset: true,
    });
    await factory.ScreenshotDiff.create({
      buildId: noisyBuild.id,
      score: 0.3,
      testId: flaky.id,
    });
    await factory.ScreenshotDiff.create({
      buildId: noisyBuild.id,
      compareScreenshotId: null,
    });
    await createPullRequestBuild({
      pullRequestId: noisy.id,
      commit: "b2",
      createdAt: "2026-09-23T10:00:00Z",
      conclusion: "no-changes",
    });

    // Monitoring builds are not pull requests.
    await createPullRequestBuild({
      pullRequestId: null,
      commit: "c1",
      createdAt: "2026-09-24T10:00:00Z",
      conclusion: "no-changes",
      mode: "monitoring",
    });

    const activity = await getMonthlyReportActivity(account, windows);

    expect(activity.pullRequests).toEqual({
      checked: 2,
      fixedAfterFlag: 1,
      intermediateCommits: 2,
    });
    expect(activity.flakyTests.current).toBe(1);
    expect(activity.flakyTests.top.map((test) => test.url)).toEqual([
      await flaky.getUrl(),
    ]);
    // Not flaky the month before.
    expect(activity.flakyTests.top[0]?.newThisMonth).toBe(true);
  });

  it("counts the changes people reviewed and the tests covered", async () => {
    const build = await factory.Build.create({
      projectId: project.id,
      createdAt: "2026-09-20T10:00:00Z",
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

    const test = (name: string) =>
      factory.Test.create({ projectId: project.id, name });
    const known = await test("known");
    const fresh = await test("fresh");
    const gone = await test("gone");
    await knex("test_stats_builds").insert([
      { testId: known.id, date: "2026-08-01T00:00:00Z", value: 1 },
      { testId: known.id, date: "2026-09-16T00:00:00Z", value: 1 },
      { testId: fresh.id, date: "2026-09-20T00:00:00Z", value: 1 },
      { testId: gone.id, date: "2026-08-02T00:00:00Z", value: 1 },
    ]);

    const activity = await getMonthlyReportActivity(account, windows);

    expect(activity.changesReviewed).toEqual({ current: 2, previous: 0 });
    expect(activity.tests).toEqual({ covered: 2, added: 1 });
  });

  it("lists the screenshots by build name, the largest first and the rest as Other", async () => {
    const bucket = (name: string, createdAt: string, screenshotCount: number) =>
      factory.ScreenshotBucket.create({
        projectId: project.id,
        name,
        createdAt,
        screenshotCount,
        storybookScreenshotCount: 0,
      });
    await bucket("e2e", "2026-08-20T10:00:00Z", 1000);
    await bucket("e2e", "2026-09-20T10:00:00Z", 1500);
    // New this month: nothing to compare it with.
    await bucket("mobile", "2026-09-20T10:00:00Z", 5000);
    for (const [name, count] of [
      ["a", 600],
      ["b", 500],
      ["c", 400],
      ["d", 200],
      ["e", 100],
    ] as const) {
      await bucket(name, "2026-08-20T10:00:00Z", 50);
      await bucket(name, "2026-09-20T10:00:00Z", count);
    }
    // Gone this month: left out.
    await bucket("legacy", "2026-08-20T10:00:00Z", 300);

    const activity = await getMonthlyReportActivity(account, windows);

    expect(activity.screenshotsByBuildName).toEqual([
      { label: "mobile", current: 5000, previous: 0 },
      { label: "e2e", current: 1500, previous: 1000 },
      { label: "a", current: 600, previous: 50 },
      { label: "b", current: 500, previous: 50 },
      { label: "c", current: 400, previous: 50 },
      { label: "Other", current: 300, previous: 100 },
    ]);
  });
});
