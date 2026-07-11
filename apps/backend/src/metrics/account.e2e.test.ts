import { beforeEach, describe, expect, it } from "vitest";

import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  getAccountBuildMetrics,
  getAccountMetrics,
  getAccountScreenshotMetrics,
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
    });
    expect(metrics.screenshots.projects).toEqual([project]);
    expect(metrics.builds.all.total).toBe(1);
    expect(metrics.builds.all.projects).toEqual({ [project.id]: 1 });
    expect(metrics.builds.projects).toEqual([project]);
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

    expect(metrics.screenshots.all).toEqual({ total: 0, projects: {} });
    expect(metrics.screenshots.projects).toEqual([]);
    expect(metrics.builds.all.total).toBe(0);
    expect(metrics.builds.all.projects).toEqual({});
    expect(metrics.builds.projects).toEqual([]);
  });
});
