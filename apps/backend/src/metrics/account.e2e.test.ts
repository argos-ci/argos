import { beforeEach, describe, expect, it } from "vitest";

import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  getAccountBuildMetrics,
  getAccountMetrics,
  getAccountScreenshotMetrics,
  InvalidAccountMetricsInputError,
} from "./account";

describe("getAccountScreenshotMetrics", () => {
  let project: Project;

  beforeEach(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    project = await factory.Project.create({
      id: "1000000",
      githubRepositoryId: null,
    });
    await factory.ScreenshotBucket.createMany(3, [
      {
        createdAt: new Date("2021-01-01").toISOString(),
        projectId: project.id,
        screenshotCount: 20,
      },
      {
        createdAt: new Date("2021-01-02").toISOString(),
        projectId: project.id,
        screenshotCount: 4,
      },
      {
        createdAt: new Date("2021-01-03").toISOString(),
        projectId: project.id,
        screenshotCount: 10,
      },
    ]);
  });

  describe.each(["month", "week", "day"] as const)(
    "with groupBy %s",
    (groupBy) => {
      describe("with projectIds", () => {
        it("returns the count of screenshots", async () => {
          const results = await getAccountScreenshotMetrics({
            accountId: project.accountId,
            projectIds: [project.id],
            from: new Date("2020-12-01"),
            to: new Date("2021-02-01"),
            groupBy,
          });

          expect(results.series).toMatchSnapshot();
          expect(results.all).toMatchSnapshot();
        });
      });

      describe("without projectIds", () => {
        it("returns the count of screenshots", async () => {
          const results = await getAccountScreenshotMetrics({
            accountId: project.accountId,
            from: new Date("2020-12-01"),
            to: new Date("2021-02-01"),
            groupBy,
          });

          expect(results.series).toMatchSnapshot();
          expect(results.all).toMatchSnapshot();
        });
      });
    },
  );

  it("splits the total by source, clamping buckets that over-report Storybook", async () => {
    await factory.ScreenshotBucket.createMany(2, [
      {
        createdAt: new Date("2021-01-04").toISOString(),
        projectId: project.id,
        screenshotCount: 8,
        storybookScreenshotCount: 3,
      },
      // Buckets written before the two counters shared a query can claim more
      // Storybook screenshots than screenshots.
      {
        createdAt: new Date("2021-01-05").toISOString(),
        projectId: project.id,
        screenshotCount: 5,
        storybookScreenshotCount: 9,
      },
    ]);

    const results = await getAccountScreenshotMetrics({
      accountId: project.accountId,
      from: new Date("2021-01-04"),
      to: new Date("2021-01-06"),
      groupBy: "day",
    });

    // Each day keeps its own split rather than the period's, so a count landing
    // in the wrong bucket does not hide inside the total.
    expect(results.series).toEqual([
      {
        ts: new Date("2021-01-04").getTime(),
        total: 8,
        projects: { [project.id]: 8 },
        storybook: 3,
      },
      {
        ts: new Date("2021-01-05").getTime(),
        total: 5,
        projects: { [project.id]: 5 },
        storybook: 5,
      },
      {
        ts: new Date("2021-01-06").getTime(),
        total: 0,
        projects: { [project.id]: 0 },
        storybook: 0,
      },
    ]);
    expect(results.all).toEqual({
      total: 13,
      projects: { [project.id]: 13 },
      storybook: 8,
    });
  });

  it("does not filter when projectIds is empty", async () => {
    const results = await getAccountScreenshotMetrics({
      accountId: project.accountId,
      projectIds: [],
      from: new Date("2020-12-01"),
      to: new Date("2021-02-01"),
      groupBy: "day",
    });

    expect(results.all).toEqual({
      total: 34,
      projects: { [project.id]: 34 },
      storybook: 0,
    });
  });
});

describe("getAccountBuildMetrics", () => {
  let project: Project;

  beforeEach(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    project = await factory.Project.create({
      id: "1000000",
      githubRepositoryId: null,
    });
    const [, approvedBuild, rejectedBuild, dismissedBuild] =
      await factory.Build.createMany(4, [
        {
          createdAt: new Date("2021-01-01").toISOString(),
          projectId: project.id,
          conclusion: "no-changes",
        },
        {
          createdAt: new Date("2021-01-01").toISOString(),
          projectId: project.id,
          conclusion: "changes-detected",
        },
        {
          createdAt: new Date("2021-01-02").toISOString(),
          projectId: project.id,
          conclusion: "changes-detected",
        },
        {
          createdAt: new Date("2021-01-03").toISOString(),
          projectId: project.id,
          conclusion: "changes-detected",
        },
      ]);
    const user = await factory.User.create();
    await factory.BuildReview.createMany(4, [
      // Approved build.
      { buildId: approvedBuild!.id, state: "approved" },
      // Approved then rejected by the same user, only the latest counts.
      {
        buildId: rejectedBuild!.id,
        userId: user.id,
        state: "approved",
        createdAt: new Date("2021-01-02T10:00:00Z").toISOString(),
      },
      {
        buildId: rejectedBuild!.id,
        userId: user.id,
        state: "rejected",
        createdAt: new Date("2021-01-02T11:00:00Z").toISOString(),
      },
      // Dismissed reviews are ignored.
      {
        buildId: dismissedBuild!.id,
        state: "approved",
        dismissedAt: new Date("2021-01-03T10:00:00Z").toISOString(),
        dismissedById: user.id,
      },
    ]);
  });

  describe.each(["month", "week", "day"] as const)(
    "with groupBy %s",
    (groupBy) => {
      describe("with projectIds", () => {
        it("returns the count of builds", async () => {
          const results = await getAccountBuildMetrics({
            accountId: project.accountId,
            projectIds: [project.id],
            from: new Date("2020-12-01"),
            to: new Date("2021-02-01"),
            groupBy,
          });

          expect(results.series).toMatchSnapshot();
          expect(results.all).toMatchSnapshot();
        });
      });

      describe("without projectIds", () => {
        it("returns the count of builds", async () => {
          const results = await getAccountBuildMetrics({
            accountId: project.accountId,
            from: new Date("2020-12-01"),
            to: new Date("2021-02-01"),
            groupBy,
          });

          expect(results.series).toMatchSnapshot();
          expect(results.all).toMatchSnapshot();
        });
      });
    },
  );
});

describe("getAccountMetrics", () => {
  let project: Project;

  beforeEach(async () => {
    await setupDatabase();
    project = await factory.Project.create({
      id: "1000000",
      githubRepositoryId: null,
      name: "web",
    });
  });

  it("filters metrics by project names", async () => {
    const otherProject = await factory.Project.create({
      id: "2000000",
      accountId: project.accountId,
      githubRepositoryId: null,
      name: "docs",
    });
    await factory.ScreenshotBucket.createMany(2, [
      {
        createdAt: new Date("2021-01-01").toISOString(),
        projectId: project.id,
        screenshotCount: 2,
      },
      {
        createdAt: new Date("2021-01-01").toISOString(),
        projectId: otherProject.id,
        screenshotCount: 3,
      },
    ]);
    await factory.Build.createMany(2, [
      {
        createdAt: new Date("2021-01-01").toISOString(),
        projectId: project.id,
      },
      {
        createdAt: new Date("2021-01-01").toISOString(),
        projectId: otherProject.id,
      },
    ]);

    const metrics = await getAccountMetrics({
      accountId: project.accountId,
      projectNames: [project.name],
      from: new Date("2020-12-31"),
      to: new Date("2021-01-02"),
      groupBy: "day",
    });

    expect(metrics.screenshots.all).toEqual({
      total: 2,
      projects: { [project.id]: 2 },
      storybook: 0,
    });
    // Creating the builds above bumped `projects."buildNumber"`, so the factory
    // instance is stale — compare against the current row.
    const currentProject = await project.$query();
    expect(metrics.screenshots.projects).toEqual([currentProject]);
    expect(metrics.builds.all.total).toBe(1);
    expect(metrics.builds.all.projects).toEqual({ [project.id]: 1 });
    expect(metrics.builds.projects).toEqual([currentProject]);
  });

  it("cuts buckets in the requested time zone", async () => {
    // 23:30 on Sep 30 in Paris (out), then 01:00 (still Sep 30 in UTC) and
    // 14:00 on Oct 1 in Paris (in).
    await factory.Build.createMany(3, [
      { createdAt: "2026-09-30T21:30:00.000Z", projectId: project.id },
      { createdAt: "2026-09-30T23:00:00.000Z", projectId: project.id },
      { createdAt: "2026-10-01T12:00:00.000Z", projectId: project.id },
    ]);

    // Oct 1 in Paris, as the analytics page sends it.
    const metrics = await getAccountMetrics({
      accountId: project.accountId,
      from: new Date("2026-09-30T22:00:00.000Z"),
      to: new Date("2026-10-01T21:59:59.999Z"),
      groupBy: "day",
      timeZone: "Europe/Paris",
    });

    expect(metrics.builds.all.total).toBe(2);
    expect(metrics.builds.series.map((serie) => serie.ts)).toEqual([
      new Date("2026-09-30T22:00:00.000Z").getTime(),
    ]);
  });

  it("rejects an unknown time zone", async () => {
    await expect(
      getAccountMetrics({
        accountId: project.accountId,
        from: new Date("2026-09-30T22:00:00.000Z"),
        to: new Date("2026-10-01T21:59:59.999Z"),
        groupBy: "day",
        timeZone: "Mars/Olympus",
      }),
    ).rejects.toThrow(InvalidAccountMetricsInputError);
  });

  it("returns no metrics when no project names match", async () => {
    await factory.ScreenshotBucket.create({
      createdAt: new Date("2021-01-01").toISOString(),
      projectId: project.id,
      screenshotCount: 2,
    });
    await factory.Build.create({
      createdAt: new Date("2021-01-01").toISOString(),
      projectId: project.id,
    });

    const metrics = await getAccountMetrics({
      accountId: project.accountId,
      projectNames: ["missing"],
      from: new Date("2020-12-31"),
      to: new Date("2021-01-02"),
      groupBy: "day",
    });

    expect(metrics.screenshots.all).toEqual({
      total: 0,
      projects: {},
      storybook: 0,
    });
    expect(metrics.screenshots.projects).toEqual([]);
    expect(metrics.builds.all.total).toBe(0);
    expect(metrics.builds.all.projects).toEqual({});
    expect(metrics.builds.projects).toEqual([]);
  });
});
